export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { battleGroups, battleGroupMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/groups/my?firebaseUid=xxx
 *
 * Returns all groups the current user belongs to, with member count.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firebaseUid = searchParams.get("firebaseUid");

  if (!firebaseUid) {
    return NextResponse.json(
      { error: "firebaseUid is required" },
      { status: 400 },
    );
  }

  const db = getDb();

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, firebaseUid))
    .limit(1);

  if (!user) {
    return NextResponse.json({ groups: [] });
  }

  // Find all group memberships for this user
  const memberships = await db
    .select()
    .from(battleGroupMembers)
    .where(eq(battleGroupMembers.userId, user.id));

  if (memberships.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  // Fetch group details
  const allGroups = await db.select().from(battleGroups);
  const groupIdSet = new Set(memberships.map((m) => m.groupId));
  const myGroups = allGroups.filter((g) => groupIdSet.has(g.id));

  // Count members per group
  const allMembers = await db.select().from(battleGroupMembers);
  const memberCountMap = new Map<number, number>();
  for (const m of allMembers) {
    if (groupIdSet.has(m.groupId)) {
      memberCountMap.set(m.groupId, (memberCountMap.get(m.groupId) ?? 0) + 1);
    }
  }

  const groups = myGroups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    inviteCode: g.inviteCode,
    memberCount: memberCountMap.get(g.id) ?? 0,
    createdAt: g.createdAt,
  }));

  return NextResponse.json({ groups });
}
