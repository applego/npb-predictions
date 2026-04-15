export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, seasons, predictions, rankingPicks, actualTeamStandings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";

/**
 * GET /api/rankings/all-time
 *
 * All-time commentator rankings.
 * FAIR SCORING: per year, only the BEST variant is counted (no multi-prediction inflation).
 * Also computes per-year deviation scores (偏差値).
 */
export async function GET() {
  const db = getDb();

  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.year));
  const allStandings = await db.select().from(actualTeamStandings);

  // Build actual rank maps: seasonId -> league -> teamName -> rank
  const actualBySeasonLeague = new Map<number, Map<string, Map<string, number>>>();
  for (const row of allStandings) {
    if (!actualBySeasonLeague.has(row.seasonId)) actualBySeasonLeague.set(row.seasonId, new Map());
    const leagueMap = actualBySeasonLeague.get(row.seasonId)!;
    if (!leagueMap.has(row.league)) leagueMap.set(row.league, new Map());
    const teamMap = leagueMap.get(row.league)!;
    if (!teamMap.has(row.teamName)) teamMap.set(row.teamName, row.rank);
  }

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allPreds = await db.select().from(predictions);
  const allPicks = await db.select().from(rankingPicks);

  const picksByPred = new Map<number, typeof allPicks>();
  for (const rp of allPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  const seasonYearMap = new Map(allSeasons.map((s) => [s.id, s.year]));

  // Compute score for every prediction
  type PredScore = { userId: number; year: number; centralScore: number; pacificScore: number; totalScore: number; variant: string | null };
  const allPredScores: PredScore[] = [];

  for (const pred of allPreds) {
    const user = userMap.get(pred.userId);
    if (!user || user.role === "system") continue;

    const year = seasonYearMap.get(pred.seasonId);
    if (!year) continue;

    const leagueMap = actualBySeasonLeague.get(pred.seasonId);
    if (!leagueMap) continue;

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

    allPredScores.push({
      userId: user.id,
      year,
      centralScore,
      pacificScore,
      totalScore: centralScore + pacificScore,
      variant: pred.variant,
    });
  }

  // Per-year statistics for deviation scores (偏差値)
  const yearStats = new Map<number, { mean: number; stddev: number }>();
  const scoresByYear = new Map<number, number[]>();
  for (const ps of allPredScores) {
    const arr = scoresByYear.get(ps.year) ?? [];
    arr.push(ps.totalScore);
    scoresByYear.set(ps.year, arr);
  }
  for (const [year, scores] of scoresByYear) {
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
    const stddev = Math.sqrt(variance);
    yearStats.set(year, { mean, stddev });
  }

  // FAIR: per user per year, keep only the BEST scoring prediction
  type YearScore = { year: number; centralScore: number; pacificScore: number; totalScore: number; deviation: number | null };
  const userBestByYear = new Map<number, Map<number, PredScore>>(); // userId -> year -> best PredScore

  for (const ps of allPredScores) {
    if (!userBestByYear.has(ps.userId)) userBestByYear.set(ps.userId, new Map());
    const yearMap = userBestByYear.get(ps.userId)!;
    const existing = yearMap.get(ps.year);
    if (!existing || ps.totalScore > existing.totalScore) {
      yearMap.set(ps.year, ps);
    }
  }

  // Build ranked list
  const ranked = Array.from(userBestByYear.entries())
    .map(([userId, yearMap]) => {
      const user = userMap.get(userId)!;
      const years: YearScore[] = [];

      for (const [year, ps] of yearMap) {
        const stats = yearStats.get(year);
        const deviation = stats && stats.stddev > 0
          ? Math.round((((ps.totalScore - stats.mean) / stats.stddev) * 10 + 50) * 10) / 10
          : null;
        years.push({
          year,
          centralScore: ps.centralScore,
          pacificScore: ps.pacificScore,
          totalScore: ps.totalScore,
          deviation,
        });
      }

      years.sort((a, b) => a.year - b.year);

      const uniqueYears = years.length;
      const allTimeTotal = years.reduce((s, y) => s + y.totalScore, 0);
      const allTimeCentral = years.reduce((s, y) => s + y.centralScore, 0);
      const allTimePacific = years.reduce((s, y) => s + y.pacificScore, 0);
      const bestYear = years.reduce((best, y) => y.totalScore > best.totalScore ? y : best, years[0]);
      const avgPerYear = uniqueYears > 0 ? Math.round((allTimeTotal / uniqueYears) * 10) / 10 : 0;
      const avgDeviation = years.filter((y) => y.deviation !== null).length > 0
        ? Math.round(years.reduce((s, y) => s + (y.deviation ?? 50), 0) / years.filter((y) => y.deviation !== null).length * 10) / 10
        : null;

      return {
        userId,
        name: user.name,
        slug: user.slug,
        source: user.source,
        yearsCount: uniqueYears,
        years,
        allTimeCentral,
        allTimePacific,
        allTimeTotal,
        avgPerYear,
        bestScore: bestYear?.totalScore ?? 0,
        bestYear: bestYear?.year ?? null,
        avgDeviation,
      };
    })
    .filter((c) => c.yearsCount > 0)
    .sort((a, b) => b.avgPerYear - a.avgPerYear) // Sort by AVERAGE, not total
    .map((c, idx) => ({ ...c, rank: idx + 1 }));

  return NextResponse.json({
    totalCommentators: ranked.length,
    availableYears: allSeasons.map((s) => s.year).sort((a, b) => a - b),
    yearStats: Object.fromEntries([...yearStats].map(([y, s]) => [y, { mean: Math.round(s.mean * 10) / 10, stddev: Math.round(s.stddev * 10) / 10 }])),
    commentators: ranked,
  });
}
