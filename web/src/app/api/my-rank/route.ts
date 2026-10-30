export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb, type DbClient } from "@/db";
import { requireAuth } from "@/lib/auth-server";
import { getOrCompute } from "@/lib/computed-cache";
import {
  seasons,
  predictions,
  rankingPicks,
  actualTeamStandings,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";

/**
 * GET /api/my-rank?year=2025   (Authorization: Bearer <Firebase ID token>)
 *
 * Returns the signed-in user's rank and score. Used by the in-app rank change
 * notifier. The caller is identified by the verified token only — a uid in the
 * query string is ignored, so nobody can read another user's rank.
 * The season ranking is one cached aggregate (rebuilt only when standings or
 * predictions change); a request reads that row plus the caller's user row.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const year = yearParam
    ? parseInt(yearParam, 10)
    : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const db = getDb();
  const ranking = await getOrCompute(db, `my-rank:${year}`, () => computeSeasonRanking(db, year), { year, includeDrafts: true });
  if (!ranking) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const index = ranking.scores.findIndex(([userId]) => userId === user.id);
  if (index === -1) {
    return NextResponse.json({ rank: null, score: null, delta: null });
  }

  return NextResponse.json({
    userId: user.id,
    userName: user.name,
    rank: index + 1,
    totalUsers: ranking.scores.length,
    score: ranking.scores[index][1],
    year,
  });
}

/** [userId, totalScore] of every prediction in the season, best first. */
async function computeSeasonRanking(db: DbClient, year: number): Promise<{ scores: [number, number][] } | null> {
  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, year));

  if (!season) return null;

  // Actual standings for this season
  const standings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, season.id))
    .orderBy(desc(actualTeamStandings.snapshotDate));

  const rankMap = new Map<string, Map<string, number>>();
  for (const row of standings) {
    if (!rankMap.has(row.league)) rankMap.set(row.league, new Map());
    const m = rankMap.get(row.league)!;
    if (!m.has(row.teamName)) m.set(row.teamName, row.rank);
  }

  if (rankMap.size === 0) return { scores: [] };

  // All predictions for this season
  const allPreds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.seasonId, season.id));

  const allPicks = await db
    .select()
    .from(rankingPicks)
    .where(inArray(rankingPicks.predictionId, db.select({ id: predictions.id }).from(predictions).where(eq(predictions.seasonId, season.id))));
  const picksByPred = new Map<number, typeof allPicks>();
  for (const rp of allPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  // Compute scores for all users
  const scores: [number, number][] = [];
  for (const pred of allPreds) {
    const picks = picksByPred.get(pred.id) ?? [];
    let rankingScore = 0;
    for (const pick of picks) {
      const leagueMap = rankMap.get(pick.league);
      if (!leagueMap) continue;
      const actualRank = leagueMap.get(pick.teamName);
      if (actualRank === undefined) continue;
      rankingScore += calcRankingPointForTeam(pick.rank, actualRank);
    }
    scores.push([pred.userId, rankingScore]);
  }

  scores.sort((a, b) => b[1] - a[1]);
  return { scores };
}
