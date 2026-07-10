export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { battleGroups, battleGroupMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-server";

/**
 * GET /api/groups/my
 *
 * Returns all groups the current user belongs to, with member count.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const db = getDb();

  // Find all group memberships for this user
  const memberships = await db
    .select()
    .from(battleGroupMembers)
    .where(eq(battleGroupMembers.userId, auth.user.id));

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
