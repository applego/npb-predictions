import { getDb } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import {
  seasons,
  actualTeamStandings,
  actualTitleSnapshots,
  predictions,
  rankingPicks,
  titlePicks,
  users,
  scoreSnapshots,
} from "@/db/schema";

import { publicPredictionRelations } from "@/lib/season-predictions";
import { getOrCompute } from "@/lib/computed-cache";

export type League = "central" | "pacific";

export async function getAllSeasons() {
  return getDb().select().from(seasons).orderBy(desc(seasons.year));
}

export async function getSeasonByYear(year: number) {
  const rows = await getDb().select().from(seasons).where(eq(seasons.year, year));
  return rows[0] ?? null;
}

export async function getFinalStandings(seasonId: number, league: League) {
  return getDb()
    .select()
    .from(actualTeamStandings)
    .where(
      and(
        eq(actualTeamStandings.seasonId, seasonId),
        eq(actualTeamStandings.league, league),
        eq(actualTeamStandings.isFinal, true)
      )
    )
    .orderBy(actualTeamStandings.rank);
}

export async function getTitleLeaders(seasonId: number, league?: League) {
  const conditions = [
    eq(actualTitleSnapshots.seasonId, seasonId),
    eq(actualTitleSnapshots.isFinal, true),
  ];
  if (league) {
    conditions.push(eq(actualTitleSnapshots.league, league));
  }
  return getDb()
    .select()
    .from(actualTitleSnapshots)
    .where(and(...conditions))
    .orderBy(actualTitleSnapshots.league, actualTitleSnapshots.category);
}

/**
 * Returns the latest title snapshot per (league, category).
 * Falls back to isFinal data if latest is not available.
 * Use this for active seasons where isFinal data is not yet set.
 */
export async function getLatestTitleLeaders(seasonId: number, league?: League) {
  const conditions = [eq(actualTitleSnapshots.seasonId, seasonId)];
  if (league) {
    conditions.push(eq(actualTitleSnapshots.league, league));
  }
  const all = await getDb()
    .select()
    .from(actualTitleSnapshots)
    .where(and(...conditions))
    .orderBy(desc(actualTitleSnapshots.snapshotDate));

  // Deduplicate: keep latest per (league, category)
  const seen = new Set<string>();
  const deduped: typeof all = [];
  for (const row of all) {
    const key = `${row.league}:${row.category}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    }
  }
  return deduped.sort((a, b) => {
    if (a.league !== b.league) return a.league.localeCompare(b.league);
    return a.category.localeCompare(b.category);
  });
}

/**
 * Returns the latest standings snapshot per (league, rank).
 * Use this for active seasons where isFinal is not yet set.
 */
export async function getLatestStandings(seasonId: number, league: League) {
  const all = await getDb()
    .select()
    .from(actualTeamStandings)
    .where(
      and(
        eq(actualTeamStandings.seasonId, seasonId),
        eq(actualTeamStandings.league, league),
      )
    )
    .orderBy(desc(actualTeamStandings.snapshotDate));

  // Deduplicate: keep latest snapshot per team
  const seen = new Set<string>();
  const deduped: typeof all = [];
  for (const row of all) {
    if (!seen.has(row.teamName)) {
      seen.add(row.teamName);
      deduped.push(row);
    }
  }
  return deduped.sort((a, b) => a.rank - b.rank);
}

// Archive pages: cached per season (rebuilt only after data changes). Date
// columns are dropped so the cached JSON has the same shape as the live rows.
export async function getSeasonPredictions(seasonId: number, year: number) {
  const db = getDb();
  return getOrCompute(db, `archive-predictions:${seasonId}`, async () => {
    const rows = await db.query.predictions.findMany({
      where: and(eq(predictions.seasonId, seasonId), eq(predictions.isLocked, true)),
      with: publicPredictionRelations,
    });
    return rows.map(({ createdAt: _c, updatedAt: _u, lockedAt: _l, ...row }) => row);
  }, { year });
}

/** Newest snapshots of the season, first `limit` rows. */
export async function getLatestScores(seasonId: number, year: number, limit: number) {
  const db = getDb();
  return getOrCompute(db, `archive-latest-scores:${seasonId}:${limit}`, async () => {
    const rows = await db
      .select({ id: scoreSnapshots.id, userId: scoreSnapshots.userId, totalScore: scoreSnapshots.totalScore })
      .from(scoreSnapshots)
      .where(eq(scoreSnapshots.seasonId, seasonId))
      .orderBy(desc(scoreSnapshots.snapshotDate))
      .limit(limit);
    return rows;
  }, { year });
}

export const LEAGUE_LABELS: Record<string, string> = {
  central: "セ・リーグ",
  pacific: "パ・リーグ",
};

export const TITLE_LABELS: Record<string, string> = {
  batting_avg: "首位打者",
  rbi: "打点王",
  home_runs: "本塁打王",
  wins: "最多勝",
  era: "最優秀防御率",
  saves: "最多セーブ",
};

export async function getTeamStandings(seasonId: number, teamName: string) {
  return getDb()
    .select()
    .from(actualTeamStandings)
    .where(
      and(
        eq(actualTeamStandings.seasonId, seasonId),
        eq(actualTeamStandings.teamName, teamName)
      )
    )
    .orderBy(desc(actualTeamStandings.snapshotDate));
}

export async function getTeamTitlePlayers(seasonId: number, teamName: string) {
  return getDb()
    .select()
    .from(actualTitleSnapshots)
    .where(
      and(
        eq(actualTitleSnapshots.seasonId, seasonId),
        eq(actualTitleSnapshots.teamName, teamName),
        eq(actualTitleSnapshots.isFinal, true)
      )
    )
    .orderBy(actualTitleSnapshots.category);
}

export async function getTeamPredictions(seasonId: number, teamName: string) {
  const allPredictions = await getDb().query.predictions.findMany({
    where: and(eq(predictions.seasonId, seasonId), eq(predictions.isLocked, true)),
    with: publicPredictionRelations,
  });
  return allPredictions
    .map((p) => ({
      user: p.user,
      picks: p.rankingPicks.filter((rp) => rp.teamName === teamName),
    }))
    .filter((p) => p.picks.length > 0);
}
