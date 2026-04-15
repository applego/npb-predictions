export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { battleGroups, battleGroupMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Generate a 6-character alphanumeric invite code.
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude ambiguous: 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Slugify a group name for URLs.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    || `group-${Date.now()}`;
}

/**
 * POST /api/groups — Create a new battle group
 * Body: { name: string, firebaseUid: string }
 */
export async function POST(req: Request) {
  const body = await req.json() as { name?: string; firebaseUid?: string };

  if (!body.name || !body.firebaseUid) {
    return NextResponse.json(
      { error: "name and firebaseUid are required" },
      { status: 400 },
    );
  }

  const db = getDb();

  // Find the user by Firebase UID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, body.firebaseUid))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const slug = slugify(body.name) + "-" + Date.now().toString(36).slice(-4);
  const inviteCode = generateInviteCode();

  // Create the group
  const [group] = await db
    .insert(battleGroups)
    .values({
      name: body.name,
      slug,
      createdBy: user.id,
      inviteCode,
    })
    .returning();

  // Add creator as first member
  await db.insert(battleGroupMembers).values({
    groupId: group.id,
    userId: user.id,
  });

  return NextResponse.json(
    {
      id: group.id,
      name: group.name,
      slug: group.slug,
      inviteCode: group.inviteCode,
      createdAt: group.createdAt,
    },
    { status: 201 },
  );
}
