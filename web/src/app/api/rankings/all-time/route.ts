export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, seasons, predictions, rankingPicks, actualTeamStandings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";

/**
 * GET /api/rankings/all-time
 *
 * Returns all-time commentator rankings across all years.
 * Each commentator gets a per-year breakdown + total.
 */
export async function GET() {
  const db = getDb();

  // 1. All seasons + actual standings
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.year));
  const allStandings = await db.select().from(actualTeamStandings);

  // Build actual rank maps per season: seasonId -> league -> teamName -> rank
  const actualBySeasonLeague = new Map<number, Map<string, Map<string, number>>>();
  for (const row of allStandings) {
    if (!actualBySeasonLeague.has(row.seasonId)) actualBySeasonLeague.set(row.seasonId, new Map());
    const leagueMap = actualBySeasonLeague.get(row.seasonId)!;
    if (!leagueMap.has(row.league)) leagueMap.set(row.league, new Map());
    // Keep only latest (first encountered since ordered by date desc isn't guaranteed here)
    const teamMap = leagueMap.get(row.league)!;
    if (!teamMap.has(row.teamName)) teamMap.set(row.teamName, row.rank);
  }

  // 2. All commentator users
  const allUsers = await db.select().from(users).where(eq(users.role, "commentator"));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // 3. All predictions + ranking picks
  const allPreds = await db.select().from(predictions);
  const allPicks = await db.select().from(rankingPicks);

  const picksByPred = new Map<number, typeof allPicks>();
  for (const rp of allPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  // Season id -> year
  const seasonYearMap = new Map(allSeasons.map((s) => [s.id, s.year]));

  // 4. Compute scores: userId -> year -> { central, pacific, total }
  type YearScore = { year: number; centralScore: number; pacificScore: number; totalScore: number };
  const userScores = new Map<number, YearScore[]>();

  for (const pred of allPreds) {
    const user = userMap.get(pred.userId);
    if (!user) continue;

    const year = seasonYearMap.get(pred.seasonId);
    if (!year) continue;

    const leagueMap = actualBySeasonLeague.get(pred.seasonId);
    if (!leagueMap) continue; // No actual standings for this season

    const picks = picksByPred.get(pred.id) ?? [];
    let centralScore = 0;
    let pacificScore = 0;

    for (const pick of picks) {
      const teamRankMap = leagueMap.get(pick.league);
      if (!teamRankMap) continue;
      const actualRank = teamRankMap.get(pick.teamName);
      if (actualRank === undefined) continue;
      const score = calcRankingPointForTeam(pick.rank, actualRank);
      if (pick.league === "central") centralScore += score;
      else pacificScore += score;
    }

    const yearScore: YearScore = {
      year,
      centralScore,
      pacificScore,
      totalScore: centralScore + pacificScore,
    };

    const existing = userScores.get(user.id) ?? [];
    existing.push(yearScore);
    userScores.set(user.id, existing);
  }

  // 5. Build ranked list
  const ranked = Array.from(userScores.entries())
    .map(([userId, years]) => {
      const user = userMap.get(userId)!;
      const allTimeTotal = years.reduce((s, y) => s + y.totalScore, 0);
      const allTimeCentral = years.reduce((s, y) => s + y.centralScore, 0);
      const allTimePacific = years.reduce((s, y) => s + y.pacificScore, 0);
      const sortedYears = years.sort((a, b) => a.year - b.year);
      return {
        userId,
        name: user.name,
        slug: user.slug,
        source: user.source,
        variant: user.variant,
        yearsCount: years.length,
        years: sortedYears,
        allTimeCentral,
        allTimePacific,
        allTimeTotal,
        avgPerYear: years.length > 0 ? Math.round((allTimeTotal / years.length) * 10) / 10 : 0,
      };
    })
    .filter((c) => c.yearsCount > 0)
    .sort((a, b) => b.allTimeTotal - a.allTimeTotal)
    .map((c, idx) => ({ ...c, rank: idx + 1 }));

  return NextResponse.json({
    totalCommentators: ranked.length,
    availableYears: allSeasons.map((s) => s.year).sort((a, b) => a - b),
    commentators: ranked,
  });
}
