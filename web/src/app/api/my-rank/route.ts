export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  users,
  seasons,
  predictions,
  rankingPicks,
  actualTeamStandings,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";

/**
 * GET /api/my-rank?uid=FIREBASE_UID&year=2025
 *
 * Returns the current user's rank, score, and delta from previous snapshot.
 * Used by the in-app rank change notifier.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const yearParam = searchParams.get("year");

  if (!uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }

  const db = getDb();

  // Find user by Firebase UID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, uid));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Resolve year → season
  const year = yearParam
    ? parseInt(yearParam, 10)
    : new Date().getFullYear();

  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, year));

  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

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

  if (rankMap.size === 0) {
    return NextResponse.json({ rank: null, score: null, delta: null });
  }

  // All predictions for this season
  const allPreds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.seasonId, season.id));

  const allPicks = await db.select().from(rankingPicks);
  const picksByPred = new Map<number, typeof allPicks>();
  for (const rp of allPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  // Compute scores for all users
  const scores: Array<{ userId: number; totalScore: number }> = [];
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
    scores.push({ userId: pred.userId, totalScore: rankingScore });
  }

  scores.sort((a, b) => b.totalScore - a.totalScore);

  const myEntry = scores.find((s) => s.userId === user.id);
  if (!myEntry) {
    return NextResponse.json({ rank: null, score: null, delta: null });
  }

  const currentRank = scores.findIndex((s) => s.userId === user.id) + 1;
  const totalUsers = scores.length;

  return NextResponse.json({
    userId: user.id,
    userName: user.name,
    rank: currentRank,
    totalUsers,
    score: myEntry.totalScore,
    year,
  });
}
