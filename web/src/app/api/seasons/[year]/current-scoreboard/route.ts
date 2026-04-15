export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, seasons, predictions, rankingPicks, actualTeamStandings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year: yearStr } = await params;
  const yearNum = parseInt(yearStr, 10);

  const db = getDb();
  const [season] = await db.select().from(seasons).where(eq(seasons.year, yearNum));
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  // Actual standings
  const standings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, season.id))
    .orderBy(desc(actualTeamStandings.snapshotDate));

  const rankMap = new Map<string, Map<string, number>>(); // league -> teamName -> rank
  for (const row of standings) {
    if (!rankMap.has(row.league)) rankMap.set(row.league, new Map());
    const m = rankMap.get(row.league)!;
    if (!m.has(row.teamName)) m.set(row.teamName, row.rank);
  }

  if (rankMap.size === 0) {
    return NextResponse.json({ season, scores: [] });
  }

  // All predictions for this season (friends only, not commentators)
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const preds = await db.select().from(predictions).where(eq(predictions.seasonId, season.id));
  // Show all users' scores (friends + commentators)
  const targetPreds = preds;

  const allPicks = await db.select().from(rankingPicks);
  const picksByPred = new Map<number, typeof allPicks>();
  for (const rp of allPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  // Compute scores
  const scores = targetPreds.map((pred) => {
    const user = userMap.get(pred.userId);
    if (!user) return null;

    const picks = picksByPred.get(pred.id) ?? [];
    let rankingScore = 0;

    for (const pick of picks) {
      const leagueMap = rankMap.get(pick.league);
      if (!leagueMap) continue;
      const actualRank = leagueMap.get(pick.teamName);
      if (actualRank === undefined) continue;
      rankingScore += calcRankingPointForTeam(pick.rank, actualRank);
    }

    return {
      userId: user.id,
      userName: user.name,
      rankingScore,
      titleScore: 0,
      totalScore: rankingScore,
      snapshotDate: new Date().toISOString(),
    };
  }).filter(Boolean);

  scores.sort((a, b) => b!.totalScore - a!.totalScore);

  return NextResponse.json({ season, scores });
}
