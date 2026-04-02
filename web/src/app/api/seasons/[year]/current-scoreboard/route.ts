export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { scoreSnapshots, seasons, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  const [season] = await getDb()
    .select()
    .from(seasons)
    .where(eq(seasons.year, parseInt(year, 10)));
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const scores = await getDb()
    .select({
      userId: scoreSnapshots.userId,
      userName: users.name,
      rankingScore: scoreSnapshots.rankingScore,
      titleScore: scoreSnapshots.titleScore,
      totalScore: scoreSnapshots.totalScore,
      snapshotDate: scoreSnapshots.snapshotDate,
    })
    .from(scoreSnapshots)
    .innerJoin(users, eq(scoreSnapshots.userId, users.id))
    .where(eq(scoreSnapshots.seasonId, season.id))
    .orderBy(desc(scoreSnapshots.totalScore));

  return NextResponse.json({ season, scores });
}
