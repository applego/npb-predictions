import { getDb } from "@/db";
import { users, seasons, predictions, rankingPicks, actualTeamStandings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";
import type { Season, ScoreboardResponse } from "@/lib/types";

const toStr = (d: Date | number | null | undefined): string | null =>
  d === null || d === undefined ? null : d instanceof Date ? d.toISOString() : String(d);

export async function getSeasons(): Promise<Season[]> {
  const db = getDb();
  const rows = await db.select().from(seasons).orderBy(desc(seasons.year));
  return rows.map((r) => ({
    id: r.id,
    year: r.year,
    label: r.label,
    isActive: r.isActive,
    lockDate: toStr(r.lockDate),
    createdAt: toStr(r.createdAt) ?? "",
  }));
}

/**
 * Get scoreboard for a given year.
 * Computes scores on the fly from ranking_picks + actual_team_standings.
 * Shows ALL users (friends + commentators).
 */
export async function getScoreboardData(
  year: number
): Promise<ScoreboardResponse | null> {
  const db = getDb();

  const [season] = await db.select().from(seasons).where(eq(seasons.year, year));
  if (!season) return null;

  const seasonInfo: Season = {
    id: season.id,
    year: season.year,
    label: season.label,
    isActive: season.isActive,
    lockDate: toStr(season.lockDate),
    createdAt: toStr(season.createdAt) ?? "",
  };

  // Actual standings
  const standings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, season.id));

  const rankMap = new Map<string, Map<string, number>>();
  for (const row of standings) {
    if (!rankMap.has(row.league)) rankMap.set(row.league, new Map());
    const m = rankMap.get(row.league)!;
    if (!m.has(row.teamName)) m.set(row.teamName, row.rank);
  }

  if (rankMap.size === 0) {
    return { season: seasonInfo, scores: [] };
  }

  // All users + predictions
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const preds = await db.select().from(predictions).where(eq(predictions.seasonId, season.id));
  const allPicks = await db.select().from(rankingPicks);

  const picksByPred = new Map<number, typeof allPicks>();
  for (const rp of allPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  // Compute scores for all users
  const scores: ScoreboardResponse["scores"] = [];
  for (const pred of preds) {
    const user = userMap.get(pred.userId);
    if (!user) continue;
    // Skip system role (non-commentator non-human entries)
    if (user.role === "system") continue;

    const picks = picksByPred.get(pred.id) ?? [];
    let rankingScore = 0;
    for (const pick of picks) {
      const leagueMap = rankMap.get(pick.league);
      if (!leagueMap) continue;
      const actualRank = leagueMap.get(pick.teamName);
      if (actualRank === undefined) continue;
      rankingScore += calcRankingPointForTeam(pick.rank, actualRank);
    }

    scores.push({
      userId: user.id,
      userName: user.name,
      rankingScore,
      titleScore: 0,
      totalScore: rankingScore,
      snapshotDate: new Date().toISOString(),
    });
  }

  scores.sort((a, b) => b.totalScore - a.totalScore);

  return { season: seasonInfo, scores };
}
