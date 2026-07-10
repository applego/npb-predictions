export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { battleGroups, battleGroupMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-server";

/**
 * POST /api/groups/join — Join a group via invite code
 * Body: { inviteCode: string }
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const body = await req.json() as { inviteCode?: string };

  if (!body.inviteCode) {
    return NextResponse.json(
      { error: "inviteCode is required" },
      { status: 400 },
    );
  }

  const db = getDb();

  // Find group by invite code
  const [group] = await db
    .select()
    .from(battleGroups)
    .where(eq(battleGroups.inviteCode, body.inviteCode.toUpperCase()))
    .limit(1);

  if (!group) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 },
    );
  }

  // Check if already a member
  const existingMembers = await db
    .select()
    .from(battleGroupMembers)
    .where(eq(battleGroupMembers.groupId, group.id));

  const alreadyMember = existingMembers.some((m) => m.userId === auth.user.id);
  if (alreadyMember) {
    return NextResponse.json({
      message: "Already a member",
      group: {
        id: group.id,
        name: group.name,
        slug: group.slug,
      },
    });
  }

  // Add member
  await db.insert(battleGroupMembers).values({
    groupId: group.id,
    userId: auth.user.id,
  });

  return NextResponse.json(
    {
      message: "Joined successfully",
      group: {
        id: group.id,
        name: group.name,
        slug: group.slug,
      },
    },
    { status: 201 },
  );
}
