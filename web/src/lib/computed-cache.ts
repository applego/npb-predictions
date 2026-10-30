import { eq } from "drizzle-orm";
import type { DbClient } from "@/db";
import { computedCache } from "@/db/schema";

/** Scores and standings change at most a few times a day (cron / admin). */
export const COMPUTED_CACHE_TTL_SECONDS = 3600;

/**
 * Serve a whole-table aggregate from one `computed_cache` row (1 row read)
 * and recompute it only after the TTL. D1 bills rows scanned, so recomputing
 * the all-time ranking on every request exhausted the account-wide quota.
 * Any cache failure (e.g. the table not migrated yet) falls back to compute().
 */
export async function getOrCompute<T>(
  db: DbClient,
  key: string,
  compute: () => Promise<T>,
  ttlSeconds = COMPUTED_CACHE_TTL_SECONDS,
): Promise<T> {
  const now = Math.floor(Date.now() / 1000);
  try {
    const [row] = await db.select().from(computedCache).where(eq(computedCache.key, key));
    if (row && now - row.computedAt < ttlSeconds) return JSON.parse(row.value) as T;
  } catch {
    return compute();
  }

  const value = await compute();
  try {
    const json = JSON.stringify(value);
    await db
      .insert(computedCache)
      .values({ key, value: json, computedAt: now })
      .onConflictDoUpdate({ target: computedCache.key, set: { value: json, computedAt: now } });
  } catch {
    // Serving fresh data matters more than caching it.
  }
  return value;
}
