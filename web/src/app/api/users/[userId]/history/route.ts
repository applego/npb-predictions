export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, seasons, scoreSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  const [allSeasons, snaps] = await Promise.all([
    db.select().from(seasons),
    db.select().from(scoreSnapshots).where(eq(scoreSnapshots.userId, uid)),
  ]);

  // Keep best snapshot per season (highest totalScore)
  const snapBySeason = new Map<number, (typeof snaps)[0]>();
  for (const s of snaps) {
    const existing = snapBySeason.get(s.seasonId);
    if (!existing || s.totalScore > existing.totalScore) {
      snapBySeason.set(s.seasonId, s);
    }
  }

  const history = allSeasons
    .sort((a, b) => a.year - b.year)
    .flatMap((season) => {
      const snap = snapBySeason.get(season.id);
      if (!snap) return [];
      return [
        {
          year: season.year,
          totalScore: snap.totalScore,
          rankingScore: snap.rankingScore,
          titleScore: snap.titleScore,
        },
      ];
    });

  return NextResponse.json({ userId: uid, userName: user.name, history });
}
