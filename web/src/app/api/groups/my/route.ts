export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { battleGroups, battleGroupMembers } from "@/db/schema";
import { count, eq, inArray } from "drizzle-orm";
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

  // Only this user's groups and their member counts — never whole tables.
  const myGroupIds = db
    .select({ id: battleGroupMembers.groupId })
    .from(battleGroupMembers)
    .where(eq(battleGroupMembers.userId, auth.user.id));
  const myGroups = await db.select().from(battleGroups).where(inArray(battleGroups.id, myGroupIds)).orderBy(battleGroups.id);
  const counts = await db
    .select({ groupId: battleGroupMembers.groupId, n: count() })
    .from(battleGroupMembers)
    .where(inArray(battleGroupMembers.groupId, myGroupIds))
    .groupBy(battleGroupMembers.groupId);
  const memberCountMap = new Map(counts.map((c) => [c.groupId, c.n]));

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
