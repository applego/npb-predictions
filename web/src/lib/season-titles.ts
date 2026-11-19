import { desc, eq } from "drizzle-orm";
import type { DbClient } from "@/db";
import { actualTitleSnapshots } from "@/db/schema";
import { getOrCompute } from "@/lib/computed-cache";

/**
 * A season's title snapshots, newest first — the full history, because
 * callers build "latest per category" maps and the titles API returns the
 * history itself. The list cannot be shrunk, so it is served from
 * computed_cache (key shared by every reader of the season) instead of
 * re-reading the whole season on every request; a recompute reads the
 * season's rows about once and happens only after title data changes.
 */
export function getSeasonTitles(db: DbClient, seasonId: number, year: number) {
  return getOrCompute(
    db,
    `season-titles:${year}`,
    () =>
      db
        .select()
        .from(actualTitleSnapshots)
        .where(eq(actualTitleSnapshots.seasonId, seasonId))
        .orderBy(desc(actualTitleSnapshots.snapshotDate)),
    { year },
  );
}
