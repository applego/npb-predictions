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

export async function getSeasonPredictions(seasonId: number) {
  return getDb().query.predictions.findMany({
    where: eq(predictions.seasonId, seasonId),
    with: {
      user: true,
      rankingPicks: true,
      titlePicks: true,
    },
  });
}

export async function getLatestScores(seasonId: number) {
  return getDb()
    .select()
    .from(scoreSnapshots)
    .where(eq(scoreSnapshots.seasonId, seasonId))
    .orderBy(desc(scoreSnapshots.snapshotDate));
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
    where: eq(predictions.seasonId, seasonId),
    with: {
      user: true,
      rankingPicks: true,
    },
  });
  return allPredictions
    .map((p) => ({
      user: p.user,
      picks: p.rankingPicks.filter((rp) => rp.teamName === teamName),
    }))
    .filter((p) => p.picks.length > 0);
}
