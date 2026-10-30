import { and, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type { DbClient } from "@/db";
import { computedCache } from "@/db/schema";

/**
 * Safety net only: SQLite triggers (drizzle/0016) advance change counters on
 * every relevant write, so results normally live until the next update.
 */
export const COMPUTED_CACHE_TTL_SECONDS = 24 * 3600;
/** Per-colo edge copy: 1000 hits within this window cost no D1 reads. */
export const EDGE_CACHE_SECONDS = 300;
/**
 * After a data change a key is recomputed at most this often, so a burst of
 * writes (an import, a scraper run) costs one recompute per window, not one
 * per write. Public results lag a change by at most this long.
 */
const MIN_RECOMPUTE_SECONDS = 1800;
/** A recompute that has not finished by then may be retried by another request. */
const CLAIM_TIMEOUT_SECONDS = 120;
const EDGE_ORIGIN = "https://computed-cache.internal/";
/** Rows untouched this long belong to old deploys (live keys refresh daily). */
const GARBAGE_AFTER_SECONDS = 7 * 24 * 3600;
/**
 * dev and production deployments share one D1 database, and a new deploy may
 * change a result's shape: keys are namespaced by the build's commit so each
 * build only ever reads results it computed itself.
 */
const KEY_PREFIX = `${(process.env.NEXT_PUBLIC_COMMIT_SHA ?? "local").slice(0, 12)}:`;

function edgeCache(): Cache | undefined {
  try {
    return (globalThis as { caches?: { default?: Cache } }).caches?.default;
  } catch {
    return undefined;
  }
}

async function edgeGet<T>(key: string): Promise<T | undefined> {
  try {
    const hit = await edgeCache()?.match(EDGE_ORIGIN + encodeURIComponent(key));
    return hit ? ((await hit.json()) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function edgePut(key: string, json: string): Promise<void> {
  try {
    await edgeCache()?.put(EDGE_ORIGIN + encodeURIComponent(key), new Response(json, {
      headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${EDGE_CACHE_SECONDS}` },
    }));
  } catch {
    // The D1 row is the source of truth; the edge copy is an optimisation.
  }
}

/** Losers of a cold-key lease poll this often for the winner's result. */
const LEASE_POLL_MS = 250;
const LEASE_POLLS = 8;
/** A placeholder row: the key is being computed for the first time. */
const PENDING = "";
/**
 * D1 caps a value at 2 MB; JSON characters can take 3 bytes (Japanese), so a
 * larger result is split into rows `${key}#${computedAt}#${i}`. Reading it
 * costs one row per part — bounded by result size, not by traffic.
 */
const PART_CHARS = 500_000;

type CacheState = {
  changedAt: number;
  value: string | null;
  computedAt: number | null;
  basis: number | null;
  claimedAt: number | null;
  parts: number | null;
};

/**
 * Serve a public aggregate (scoreboards, rankings, news) as one stored result
 * so that D1 rows read per request do not grow with users, predictions or
 * traffic. D1 bills rows scanned; recomputing these on every request
 * exhausted the account-wide daily quota.
 *
 * - fresh row (no relevant data change since it was computed, within TTL):
 *   one query, 2-3 rows read
 * - stale row: one request wins a lease (conditioned on the row it saw) and
 *   recomputes; the rest get the previous result. At most one recompute per
 *   MIN_RECOMPUTE_SECONDS per key, however many writes or visits
 * - missing key: one request inserts a pending row and computes; the rest
 *   poll briefly for its result instead of all computing at once
 * - `null` results (unknown season, …) are not stored and delete any
 *   previous result, so input cannot grow the table or resurrect old data
 * - cache table missing (migration not applied): compute directly
 */
export async function getOrCompute<T>(
  db: DbClient,
  key: string,
  compute: () => Promise<T>,
  {
    year,
    includeDrafts = false,
  }: {
    /** Season the result is built from; omit for results spanning every season. */
    year?: number;
    /** The result also depends on unlocked predictions (my-rank). */
    includeDrafts?: boolean;
  } = {},
): Promise<T> {
  key = KEY_PREFIX + key;
  const edge = await edgeGet<T>(key);
  if (edge !== undefined) return edge;

  // Change counters this result depends on: its season's (id = year; drafts
  // id = -year) and the global one (id 0), or every non-draft counter for
  // cross-season results. Counters only grow, so their sum changes whenever one does.
  const seasonScoped = year !== undefined && Number.isInteger(year);
  const clockIds = seasonScoped ? (includeDrafts ? [0, year, -year] : [0, year]) : [];
  const clocks = seasonScoped
    ? sql`(select coalesce(sum(changed_at), 0) from data_changes where id in (${sql.join(clockIds.map((id) => sql`${id}`), sql`, `)}))`
    : sql`(select coalesce(sum(changed_at), 0) from data_changes where id >= 0)`;
  const readState = async (): Promise<CacheState | undefined> => {
    const [row] = await db
      .select({
        changedAt: sql<number>`${clocks}`.mapWith(Number),
        value: computedCache.value,
        computedAt: computedCache.computedAt,
        basis: computedCache.basis,
        claimedAt: computedCache.claimedAt,
        parts: computedCache.parts,
      })
      .from(sql`(select 1) as one`)
      .leftJoin(computedCache, eq(computedCache.key, key));
    return row;
  };

  const partKey = (computedAt: number, i: number) => `${key}#${computedAt}#${i}`;
  /** The stored JSON, joined from its parts when it was split. */
  const load = async (row: CacheState): Promise<string> => {
    const parts = row.parts ?? 1;
    if (parts <= 1) return row.value!;
    const keys = Array.from({ length: parts - 1 }, (_, i) => partKey(row.computedAt ?? 0, i + 1));
    const rest = await db.select({ key: computedCache.key, value: computedCache.value }).from(computedCache).where(inArray(computedCache.key, keys));
    const byKey = new Map(rest.map((r) => [r.key, r.value]));
    if (byKey.size !== keys.length) throw new Error(`computed_cache: ${key} has missing parts`);
    return row.value! + keys.map((k) => byKey.get(k)).join("");
  };
  const parsed = async (row: CacheState): Promise<T> => JSON.parse(await load(row)) as T;

  let state: CacheState | undefined;
  try {
    state = await readState();
  } catch {
    state = undefined;
  }
  if (!state) return compute();

  const now = Math.floor(Date.now() / 1000);
  const hasValue = state.value !== null && state.value !== PENDING;
  const leaseLive = state.claimedAt !== null && state.claimedAt >= now - CLAIM_TIMEOUT_SECONDS;

  if (hasValue) {
    const fresh = state.basis === state.changedAt && now - (state.computedAt ?? 0) < COMPUTED_CACHE_TTL_SECONDS;
    try {
      if (fresh) {
        const json = await load(state);
        await edgePut(key, json);
        return JSON.parse(json) as T;
      }
      if (leaseLive || now - (state.computedAt ?? 0) < MIN_RECOMPUTE_SECONDS) return await parsed(state);
    } catch {
      // Parts replaced by a concurrent refresh: serve a direct computation.
      return compute();
    }
  }

  // Win the lease: insert a pending row for a new key, or take over the row
  // exactly as we saw it (so a request that read before another finished
  // cannot recompute the result that was just refreshed).
  let won = false;
  if (!(state.value === PENDING && leaseLive)) {
    try {
      const rows = state.value === null
        ? await db
          .insert(computedCache)
          .values({ key, value: PENDING, computedAt: 0, basis: -1, claimedAt: now })
          .onConflictDoNothing()
          .returning({ key: computedCache.key })
        : await db
          .update(computedCache)
          .set({ claimedAt: now })
          .where(and(
            eq(computedCache.key, key),
            eq(computedCache.computedAt, state.computedAt ?? 0),
            eq(computedCache.basis, state.basis ?? -1),
            state.claimedAt === null ? isNull(computedCache.claimedAt) : eq(computedCache.claimedAt, state.claimedAt),
          ))
          .returning({ key: computedCache.key });
      won = rows.length > 0;
    } catch {
      won = false;
    }
  }

  if (!won) {
    if (hasValue) return parsed(state).catch(() => compute());
    // Another request is computing this key for the first time: wait for it.
    for (let i = 0; i < LEASE_POLLS; i++) {
      await new Promise((resolve) => setTimeout(resolve, LEASE_POLL_MS));
      const next = await readState().catch(() => undefined);
      if (next?.value) return parsed(next).catch(() => compute());
      if (!next || next.value === null) break; // winner found nothing to store
    }
    return compute();
  }

  if (state.value === null) {
    // New key: clear rows no deploy has refreshed for a week (indexed range).
    const expired = now - GARBAGE_AFTER_SECONDS;
    await db
      .delete(computedCache)
      .where(and(
        lt(computedCache.computedAt, expired),
        or(isNull(computedCache.claimedAt), lt(computedCache.claimedAt, expired)),
      ))
      .catch(() => undefined);
  }

  let value: T;
  try {
    value = await compute();
  } catch (error) {
    await db.update(computedCache).set({ claimedAt: null }).where(eq(computedCache.key, key)).catch(() => undefined);
    throw error;
  }
  if (value === null || value === undefined) {
    await db.delete(computedCache).where(eq(computedCache.key, key)).catch(() => undefined);
    return value;
  }
  const json = JSON.stringify(value);
  try {
    // basis is the counter sum seen BEFORE computing: a write that lands
    // during the compute advances it, so this result is born stale.
    const basis = state.changedAt;
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += PART_CHARS) chunks.push(json.slice(i, i + PART_CHARS));
    for (let i = 1; i < chunks.length; i++) {
      await db
        .insert(computedCache)
        .values({ key: partKey(now, i), value: chunks[i], computedAt: now, basis: -2, claimedAt: null })
        .onConflictDoUpdate({ target: computedCache.key, set: { value: chunks[i], computedAt: now } });
    }
    await db
      .update(computedCache)
      .set({ value: chunks[0] ?? "", computedAt: now, basis, claimedAt: null, parts: Math.max(chunks.length, 1) })
      .where(eq(computedCache.key, key));
    // Parts of earlier results of this key: PK ranges ("$" sorts right after "#").
    await db
      .delete(computedCache)
      .where(and(
        gt(computedCache.key, `${key}#`),
        lt(computedCache.key, `${key}$`),
        or(lt(computedCache.key, `${key}#${now}#`), gt(computedCache.key, `${key}#${now}$`)),
      ));
  } catch (error) {
    // Say so instead of silently falling back to recomputing every request.
    console.error(`computed_cache: failed to store ${key} (${json.length} chars)`, error instanceof Error ? error.message : error);
    await db.update(computedCache).set({ claimedAt: null }).where(eq(computedCache.key, key)).catch(() => undefined);
  }
  await edgePut(key, json);
  return value;
}

/** Response headers for public JSON built from getOrCompute results. */
export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": `public, max-age=60, s-maxage=${EDGE_CACHE_SECONDS}`,
} as const;
