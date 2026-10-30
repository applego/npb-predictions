import { getDb } from "@/db";
import { users, seasons, predictions, rankingPicks, actualTeamStandings } from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { calcRankingPointForTeam, latestRankMap } from "@/lib/scoring";
import type { Season, ScoreboardResponse } from "@/lib/types";
import { getOrCompute } from "@/lib/computed-cache";

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
  return getOrCompute(getDb(), `scoreboard:${year}`, () => computeScoreboardData(year));
}

async function computeScoreboardData(
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

  // Actual standings: only the newest snapshot of each league.
  const standings = await db
    .select()
    .from(actualTeamStandings)
    .where(
      and(
        eq(actualTeamStandings.seasonId, season.id),
        sql`${actualTeamStandings.snapshotDate} = (SELECT max(x.snapshot_date) FROM actual_team_standings x WHERE x.season_id = ${season.id} AND x.league = ${actualTeamStandings.league})`,
      ),
    );

  const rankMap = latestRankMap(standings);

  if (rankMap.size === 0) {
    return { season: seasonInfo, scores: [] };
  }

  // Users, predictions and picks of this season only (not every season).
  const seasonPreds = and(eq(predictions.seasonId, season.id), eq(predictions.isLocked, true));
  const preds = await db.select().from(predictions).where(seasonPreds);
  const allUsers = await db
    .select()
    .from(users)
    .where(inArray(users.id, db.select({ id: predictions.userId }).from(predictions).where(seasonPreds)));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const allPicks = await db
    .select()
    .from(rankingPicks)
    .where(inArray(rankingPicks.predictionId, db.select({ id: predictions.id }).from(predictions).where(seasonPreds)));

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
      slug: user.slug,
      userRole: user.role,
      source: user.source,
      sourceUrl: user.sourceUrl,
      variant: user.variant,
      rankingScore,
      titleScore: 0,
      totalScore: rankingScore,
      snapshotDate: new Date().toISOString(),
    });
  }

  scores.sort((a, b) => b.totalScore - a.totalScore);

  return { season: seasonInfo, scores };
}
