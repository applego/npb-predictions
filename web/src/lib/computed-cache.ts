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
const LEASE_POLLS = 40;
/** A placeholder row: the key is being computed for the first time. */
const PENDING = "";
/**
 * D1 caps a value at 2 MB; JSON characters can take 3 bytes (Japanese), so a
 * larger result is split into rows `${key}#${gen}#${i}` (gen = the lease
 * token of the request that published it). Reading it costs one row per part.
 */
const PART_CHARS = 500_000;

type CacheState = {
  changedAt: number;
  value: string | null;
  computedAt: number | null;
  basis: number | null;
  claimedAt: number | null;
  parts: number | null;
  gen: string | null;
};

/** Split without separating a UTF-16 surrogate pair (emoji etc.). */
function splitJson(json: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < json.length) {
    let end = Math.min(start + PART_CHARS, json.length);
    const last = json.charCodeAt(end - 1);
    if (end < json.length && last >= 0xd800 && last <= 0xdbff) end -= 1;
    chunks.push(json.slice(start, end));
    start = end;
  }
  return chunks.length > 0 ? chunks : [""];
}

/**
 * Serve a public aggregate (scoreboards, rankings, news) as one stored result
 * so that D1 rows read per request do not grow with users, predictions or
 * traffic. D1 bills rows scanned; recomputing these on every request
 * exhausted the account-wide daily quota.
 *
 * - fresh row (no relevant data change since it was computed, within TTL):
 *   one query, a few rows (plus one per extra part of a split value)
 * - stale row: one request takes a lease (conditioned on the row it saw) and
 *   recomputes; the rest get the previous result. At most one recompute per
 *   MIN_RECOMPUTE_SECONDS per key, however many writes or visits
 * - missing key: one request inserts a pending row and computes; the rest
 *   poll for its result instead of all computing at once
 * - every publish, release and delete is conditioned on the lease token, so a
 *   request whose lease expired cannot overwrite or delete its successor's work
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
    scope,
  }: {
    /** Season the result is built from; omit for results spanning every season. */
    year?: number;
    /** The result also depends on unlocked predictions (my-rank, title picks). */
    includeDrafts?: boolean;
    /** "everything": also new sign-ups and drafts of every season (sitemap). */
    scope?: "everything";
  } = {},
): Promise<T> {
  key = KEY_PREFIX + key;
  const edge = await edgeGet<T>(key);
  if (edge !== undefined) return edge;

  // Change counters this result depends on (see drizzle/0016): its season's
  // (id = year; drafts id = -year) and the global one (id 0); every non-draft
  // counter for cross-season results; or all of them. Counters only grow, so
  // their sum changes whenever one of them does.
  const seasonScoped = year !== undefined && Number.isInteger(year) && scope !== "everything";
  const clockIds = seasonScoped ? (includeDrafts ? [0, year, -year] : [0, year]) : [];
  const clocks = seasonScoped
    ? sql`(select coalesce(sum(changed_at), 0) from data_changes where id in (${sql.join(clockIds.map((id) => sql`${id}`), sql`, `)}))`
    : scope === "everything"
      ? sql`(select coalesce(sum(changed_at), 0) from data_changes)`
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
        gen: computedCache.gen,
      })
      .from(sql`(select 1) as one`)
      .leftJoin(computedCache, eq(computedCache.key, key));
    return row;
  };
  const partKey = (gen: string, i: number) => `${key}#${gen}#${i}`;
  const deleteParts = (gen: string | null) => gen === null
    ? Promise.resolve()
    // PK range: every part of that generation ("$" sorts right after "#").
    : db.delete(computedCache)
      .where(and(gt(computedCache.key, `${key}#${gen}#`), lt(computedCache.key, `${key}#${gen}$`)))
      .then(() => undefined, () => undefined);
  /** The stored JSON, joined from its parts when it was split. */
  const load = async (row: CacheState): Promise<string> => {
    const parts = row.parts ?? 1;
    if (parts <= 1) return row.value!;
    const keys = Array.from({ length: parts - 1 }, (_, i) => partKey(row.gen ?? "", i + 1));
    const rest = await db.select({ key: computedCache.key, value: computedCache.value }).from(computedCache).where(inArray(computedCache.key, keys));
    const byKey = new Map(rest.map((r) => [r.key, r.value]));
    if (byKey.size !== keys.length) throw new Error(`computed_cache: ${key} has missing parts`);
    return row.value! + keys.map((k) => byKey.get(k)).join("");
  };

  let state: CacheState | undefined;
  try {
    state = await readState();
  } catch {
    state = undefined;
  }
  if (!state) return compute();

  const now = Math.floor(Date.now() / 1000);
  let hasValue = state.value !== null && state.value !== PENDING;
  const leaseLive = state.claimedAt !== null && state.claimedAt >= now - CLAIM_TIMEOUT_SECONDS;
  let stored: string | undefined;

  if (hasValue) {
    try {
      stored = await load(state);
    } catch {
      hasValue = false; // parts lost: repair under a lease below
    }
  }
  if (stored !== undefined) {
    const fresh = state.basis === state.changedAt && now - (state.computedAt ?? 0) < COMPUTED_CACHE_TTL_SECONDS;
    if (fresh) await edgePut(key, stored);
    if (fresh || leaseLive || now - (state.computedAt ?? 0) < MIN_RECOMPUTE_SECONDS) return JSON.parse(stored) as T;
  }

  // Take the lease: insert a pending row for a new key, or take over the row
  // exactly as we saw it (so a request that read before another finished
  // cannot recompute the result that was just refreshed).
  const token = crypto.randomUUID();
  let won = false;
  if (!(leaseLive && stored === undefined)) {
    try {
      const rows = state.value === null
        ? await db
          .insert(computedCache)
          .values({ key, value: PENDING, computedAt: now, basis: -1, claimedAt: now, lease: token })
          .onConflictDoNothing()
          .returning({ key: computedCache.key })
        : await db
          .update(computedCache)
          .set({ claimedAt: now, lease: token })
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
    if (stored !== undefined) return JSON.parse(stored) as T;
    // Another request is computing this key: wait for it rather than
    // stampeding (bounded; a computation outliving this falls back).
    for (let i = 0; i < LEASE_POLLS; i++) {
      await new Promise((resolve) => setTimeout(resolve, LEASE_POLL_MS));
      const next = await readState().catch(() => undefined);
      if (!next || next.value === null) break; // winner found nothing to store
      if (next.value !== PENDING && next.gen !== state.gen) {
        try {
          return JSON.parse(await load(next)) as T;
        } catch {
          break;
        }
      }
    }
    return compute();
  }

  const mine = and(eq(computedCache.key, key), eq(computedCache.lease, token));
  const release = () => db.update(computedCache).set({ claimedAt: null, lease: null }).where(mine).then(() => undefined, () => undefined);

  if (state.value === null) {
    // New key: clear rows no deploy has refreshed for a week (indexed range;
    // live placeholders carry their creation time, so they are not in it).
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
    await release();
    throw error;
  }
  if (value === null || value === undefined) {
    const removed = await db.delete(computedCache).where(mine).returning({ key: computedCache.key }).catch(() => []);
    if (removed.length > 0) await deleteParts(state.gen);
    return value;
  }
  const json = JSON.stringify(value);
  try {
    // basis is the counter sum seen BEFORE computing: a write that lands
    // during the compute advances it, so this result is born stale.
    const basis = state.changedAt;
    const chunks = splitJson(json);
    for (let i = 1; i < chunks.length; i++) {
      await db
        .insert(computedCache)
        .values({ key: partKey(token, i), value: chunks[i], computedAt: now, basis: -2, claimedAt: null })
        .onConflictDoNothing();
    }
    const published = await db
      .update(computedCache)
      .set({ value: chunks[0], computedAt: now, basis, claimedAt: null, lease: null, parts: chunks.length, gen: token })
      .where(mine)
      .returning({ key: computedCache.key });
    // Retire only the generation this request replaced, or its own parts if
    // its lease was lost meanwhile.
    await deleteParts(published.length > 0 ? state.gen : token);
  } catch (error) {
    // Say so instead of silently falling back to recomputing every request.
    console.error(`computed_cache: failed to store ${key} (${json.length} chars)`, error instanceof Error ? error.message : error);
    await deleteParts(token);
    await release();
  }
  await edgePut(key, json);
  return value;
}

/** Response headers for public JSON built from getOrCompute results. */
export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": `public, max-age=60, s-maxage=${EDGE_CACHE_SECONDS}`,
} as const;
