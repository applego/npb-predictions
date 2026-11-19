export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, seasons, scoreSnapshots } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

// GET /api/users/[userId]/history
// Returns year-by-year score history for a user from score_snapshots.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const uid = parseInt(userId, 10);
  if (Number.isNaN(uid)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.id, uid));
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const allSeasons = await db.select().from(seasons);

  // Keep best snapshot per season (highest totalScore). One indexed seek
  // per season (score_snapshots_season_user_total_idx ends each
  // (season, user) segment at its highest total_score) instead of reading
  // every snapshot the user has ever accumulated.
  const history: {
    year: number;
    totalScore: number;
    rankingScore: number;
    titleScore: number;
  }[] = [];
  for (const season of [...allSeasons].sort((a, b) => a.year - b.year)) {
    const [best] = await db
      .select({
        totalScore: scoreSnapshots.totalScore,
        rankingScore: scoreSnapshots.rankingScore,
        titleScore: scoreSnapshots.titleScore,
      })
      .from(scoreSnapshots)
      .where(and(eq(scoreSnapshots.userId, uid), eq(scoreSnapshots.seasonId, season.id)))
      .orderBy(desc(scoreSnapshots.totalScore))
      .limit(1);
    if (!best) continue;
    history.push({ year: season.year, ...best });
  }

  return NextResponse.json({ userId: uid, userName: user.name, history });
}
