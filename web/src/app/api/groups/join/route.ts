export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { battleGroups, battleGroupMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/groups/join — Join a group via invite code
 * Body: { inviteCode: string, firebaseUid: string }
 */
export async function POST(req: Request) {
  const body = await req.json() as { inviteCode?: string; firebaseUid?: string };

  if (!body.inviteCode || !body.firebaseUid) {
    return NextResponse.json(
      { error: "inviteCode and firebaseUid are required" },
      { status: 400 },
    );
  }

  const db = getDb();

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, body.firebaseUid))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

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

  const alreadyMember = existingMembers.some((m) => m.userId === user.id);
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
    userId: user.id,
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
