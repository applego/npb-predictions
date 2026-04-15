export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { likes } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

// GET /api/likes/[userId] — returns { count, likedBy: string[] }
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
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(likes)
    .where(eq(likes.targetUserId, uid));

  return NextResponse.json({ userId: uid, count: rows[0]?.count ?? 0 });
}

// POST /api/likes/[userId] — toggle like, body: { fingerprint }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const uid = parseInt(userId, 10);
  if (Number.isNaN(uid)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const body = (await req.json()) as { fingerprint?: string };
  const fingerprint = body.fingerprint?.slice(0, 64);
  if (!fingerprint) {
    return NextResponse.json({ error: "fingerprint required" }, { status: 400 });
  }

  const db = getDb();

  // Check if already liked
  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.targetUserId, uid), eq(likes.fingerprint, fingerprint)))
    .limit(1);

  if (existing.length > 0) {
    // Unlike
    await db
      .delete(likes)
      .where(and(eq(likes.targetUserId, uid), eq(likes.fingerprint, fingerprint)));
  } else {
    // Like
    await db.insert(likes).values({ targetUserId: uid, fingerprint }).onConflictDoNothing();
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(likes)
    .where(eq(likes.targetUserId, uid));

  return NextResponse.json({ userId: uid, count, liked: existing.length === 0 });
}
