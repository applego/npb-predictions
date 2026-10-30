import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { DbClient } from "@/db";
import { computedCache, dataChanges } from "@/db/schema";

/**
 * Safety net only: SQLite triggers (drizzle/0016) mark every cached result
 * stale as soon as scored data changes, so results normally live until the
 * next standings/prediction update.
 */
export const COMPUTED_CACHE_TTL_SECONDS = 24 * 3600;
/** Per-colo edge copy: 1000 hits within this window cost no D1 reads. */
export const EDGE_CACHE_SECONDS = 300;
/**
 * After a data change a key is recomputed at most this often, so a burst of
 * writes (an import, a scraper run) costs one recompute per window, not one
 * per write. Public results lag a change by at most this long.
 */
const MIN_RECOMPUTE_SECONDS = 300;
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

/**
 * Serve a public aggregate (scoreboards, rankings, news) as one stored result
 * so that D1 rows read per request do not grow with users, predictions or
 * traffic. D1 bills rows scanned; recomputing these on every request
 * exhausted the account-wide daily quota.
 *
 * - fresh row (no data change since it was computed, within TTL): 2 rows read
 * - stale row: exactly one request claims the recompute, the rest get the
 *   previous result (stale-while-revalidate), so a traffic spike right after
 *   an update still recomputes once; and never more than once per
 *   MIN_RECOMPUTE_SECONDS per key
 * - no row yet / cache table missing: compute directly
 * `null` results (e.g. unknown season) are never stored, so arbitrary keys
 * from user input cannot grow the table.
 */
export async function getOrCompute<T>(
  db: DbClient,
  key: string,
  compute: () => Promise<T>,
  ttlSeconds = COMPUTED_CACHE_TTL_SECONDS,
): Promise<T> {
  key = KEY_PREFIX + key;
  const edge = await edgeGet<T>(key);
  if (edge !== undefined) return edge;

  const now = Math.floor(Date.now() / 1000);
  // data_changes always has its one row, so this returns the change clock
  // even when the key has no cached result yet.
  let state: { changedAt: number; value: string | null; computedAt: number | null; basis: number | null } | undefined;
  try {
    [state] = await db
      .select({
        changedAt: dataChanges.changedAt,
        value: computedCache.value,
        computedAt: computedCache.computedAt,
        basis: computedCache.basis,
      })
      .from(dataChanges)
      .leftJoin(computedCache, eq(computedCache.key, key))
      .where(eq(dataChanges.id, 1));
  } catch {
    state = undefined;
  }
  if (!state) return compute();

  const cached = state.value;
  if (cached !== null) {
    const fresh = state.basis === state.changedAt && now - (state.computedAt ?? 0) < ttlSeconds;
    if (fresh) {
      await edgePut(key, cached);
      return JSON.parse(cached) as T;
    }
    if (now - (state.computedAt ?? 0) < MIN_RECOMPUTE_SECONDS) return JSON.parse(cached) as T;
    let claimed = false;
    try {
      const won = await db
        .update(computedCache)
        .set({ claimedAt: now })
        .where(and(
          eq(computedCache.key, key),
          or(isNull(computedCache.claimedAt), lt(computedCache.claimedAt, now - CLAIM_TIMEOUT_SECONDS)),
        ))
        .returning({ key: computedCache.key });
      claimed = won.length > 0;
    } catch {
      claimed = false;
    }
    if (!claimed) return JSON.parse(cached) as T;
  }

  const value = await compute();
  if (value === null || value === undefined) return value;
  const json = JSON.stringify(value);
  try {
    // basis is the change clock seen BEFORE computing: a write that lands
    // during the compute moves the clock, so this result is born stale.
    const basis = state.changedAt;
    await db
      .insert(computedCache)
      .values({ key, value: json, computedAt: now, basis, claimedAt: null })
      .onConflictDoUpdate({ target: computedCache.key, set: { value: json, computedAt: now, basis, claimedAt: null } });
    if (cached === null) await db.delete(computedCache).where(lt(computedCache.computedAt, now - GARBAGE_AFTER_SECONDS));
  } catch {
    // Serving fresh data matters more than caching it.
  }
  await edgePut(key, json);
  return value;
}

/** Response headers for public JSON built from getOrCompute results. */
export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": `public, max-age=60, s-maxage=${EDGE_CACHE_SECONDS}`,
} as const;
