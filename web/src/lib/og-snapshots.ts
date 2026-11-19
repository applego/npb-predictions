import { and, desc, eq, inArray, lte, max } from "drizzle-orm";
import type { DbClient } from "@/db";
import { scoreSnapshots, users } from "@/db/schema";

/**
 * Bounded reads behind the OG image aggregates (og-weekly-top5,
 * og-weekly-changes, standings-og-top5 in lib/computed-cache.ts).
 *
 * score_snapshots grows by one row per user per recompute, so reading a
 * whole season to find five names cost more rows every day. These helpers
 * only ever touch the rows the result is built from, via the indexes of
 * drizzle/0017:
 * - top 5: walk the season in total_score order (season_total index) and
 *   stop as soon as five distinct users have been seen
 * - weekly changes: read the latest snapshot day and the day a week before
 *   it (season_date index) — two days of rows, however long the season is
 */

export type SeasonTopEntry = {
  userId: number;
  name: string;
  totalScore: number;
  rankingScore: number;
  titleScore: number;
};

const TOP_PAGE = 100;
const TOP_N = 5;

/** Top 5 users by their best (highest total_score) snapshot of the season. */
export async function getSeasonTop5(db: DbClient, seasonId: number): Promise<SeasonTopEntry[]> {
  const best: Omit<SeasonTopEntry, "name">[] = [];
  const seen = new Set<number>();
  // The first TOP_N distinct users in total_score order are the answer;
  // extra pages are only needed when one user fills the top rows alone.
  for (let offset = 0; best.length < TOP_N; offset += TOP_PAGE) {
    const page = await db
      .select({
        userId: scoreSnapshots.userId,
        totalScore: scoreSnapshots.totalScore,
        rankingScore: scoreSnapshots.rankingScore,
        titleScore: scoreSnapshots.titleScore,
      })
      .from(scoreSnapshots)
      .where(eq(scoreSnapshots.seasonId, seasonId))
      .orderBy(desc(scoreSnapshots.totalScore))
      .limit(TOP_PAGE)
      .offset(offset);
    if (page.length === 0) break;
    for (const row of page) {
      if (seen.has(row.userId)) continue;
      seen.add(row.userId);
      best.push(row);
      if (best.length >= TOP_N) break;
    }
    if (page.length < TOP_PAGE) break;
  }
  if (best.length === 0) return [];
  const names = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, best.map((b) => b.userId)));
  const nameById = new Map(names.map((u) => [u.id, u.name]));
  return best.map((b) => ({ ...b, name: nameById.get(b.userId) ?? "" }));
}

export type SeasonWeeklyChanges = {
  latestMs: number;
  weekAgoMs: number;
  changes: { userName: string; currentScore: number; delta: number }[];
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Top 5 score gains over the last week of snapshots, or null when the
 * season has no snapshots. Relies on the recompute invariant that every
 * user gets a snapshot on every snapshot day; a user missing from one of
 * the two days is filled in with a per-user seek (score_user_season_date
 * index), so the result matches a full scan on any data that satisfies
 * the invariant, and stays exact for the previous-day side regardless.
 */
export async function getSeasonWeeklyChanges(db: DbClient, seasonId: number): Promise<SeasonWeeklyChanges | null> {
  const [latestRow] = await db
    .select({ v: max(scoreSnapshots.snapshotDate) })
    .from(scoreSnapshots)
    .where(eq(scoreSnapshots.seasonId, seasonId));
  const latestDate = latestRow?.v;
  if (!latestDate) return null;
  const weekAgo = new Date(latestDate.getTime() - WEEK_MS);

  const [prevRow] = await db
    .select({ v: max(scoreSnapshots.snapshotDate) })
    .from(scoreSnapshots)
    .where(and(eq(scoreSnapshots.seasonId, seasonId), lte(scoreSnapshots.snapshotDate, weekAgo)));
  const prevDate = prevRow?.v ?? null;

  const [latestRows, prevRows] = await Promise.all([
    db
      .select({
        userId: scoreSnapshots.userId,
        totalScore: scoreSnapshots.totalScore,
        name: users.name,
      })
      .from(scoreSnapshots)
      .innerJoin(users, eq(users.id, scoreSnapshots.userId))
      .where(and(eq(scoreSnapshots.seasonId, seasonId), eq(scoreSnapshots.snapshotDate, latestDate))),
    prevDate
      ? db
        .select({ userId: scoreSnapshots.userId, totalScore: scoreSnapshots.totalScore })
        .from(scoreSnapshots)
        .where(and(eq(scoreSnapshots.seasonId, seasonId), eq(scoreSnapshots.snapshotDate, prevDate)))
      : Promise.resolve([] as { userId: number; totalScore: number }[]),
  ]);

  const prevByUser = new Map(prevRows.map((r) => [r.userId, r.totalScore]));
  const changes: SeasonWeeklyChanges["changes"] = [];
  for (const latest of latestRows) {
    let prevTotal = prevByUser.get(latest.userId);
    if (prevTotal === undefined) {
      // No snapshot on the week-ago day itself: use the user's newest
      // snapshot at or before it (one indexed seek), else 0 — the same
      // fallback a full scan in date order would produce.
      const [older] = await db
        .select({ totalScore: scoreSnapshots.totalScore })
        .from(scoreSnapshots)
        .where(and(
          eq(scoreSnapshots.userId, latest.userId),
          eq(scoreSnapshots.seasonId, seasonId),
          lte(scoreSnapshots.snapshotDate, weekAgo),
        ))
        .orderBy(desc(scoreSnapshots.snapshotDate))
        .limit(1);
      prevTotal = older?.totalScore ?? 0;
    }
    changes.push({
      userName: latest.name,
      currentScore: latest.totalScore,
      delta: latest.totalScore - prevTotal,
    });
  }
  changes.sort((a, b) => b.delta - a.delta);
  return {
    latestMs: latestDate.getTime(),
    weekAgoMs: weekAgo.getTime(),
    changes: changes.slice(0, TOP_N),
  };
}
