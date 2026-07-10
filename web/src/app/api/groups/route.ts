export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { battleGroups, battleGroupMembers } from "@/db/schema";
import { requireAuth } from "@/lib/auth-server";

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
 * Body: { name: string }
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const body = await req.json() as { name?: string };

  if (!body.name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  const db = getDb();

  const slug = slugify(body.name) + "-" + Date.now().toString(36).slice(-4);
  const inviteCode = generateInviteCode();

  // Create the group
  const [group] = await db
    .insert(battleGroups)
    .values({
      name: body.name,
      slug,
      createdBy: auth.user.id,
      inviteCode,
    })
    .returning();

  // Add creator as first member
  await db.insert(battleGroupMembers).values({
    groupId: group.id,
    userId: auth.user.id,
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
