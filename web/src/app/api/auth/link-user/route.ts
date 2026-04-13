export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface LinkUserBody {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export async function POST(req: Request) {
  const body = (await req.json()) as LinkUserBody;

  if (!body.firebaseUid) {
    return NextResponse.json(
      { error: "firebaseUid is required" },
      { status: 400 }
    );
  }

  const db = getDb();

  // 1. Check if a user with this firebaseUid already exists
  const existingByUid = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, body.firebaseUid))
    .limit(1);

  if (existingByUid.length > 0) {
    // Already linked — return the existing user
    const user = existingByUid[0];
    return NextResponse.json({
      id: user.id,
      name: user.name,
      slug: user.slug,
      avatarUrl: user.avatarUrl,
      role: user.role,
      firebaseUid: user.firebaseUid,
    });
  }

  // 2. Check if a user with matching email exists (link by email)
  if (body.email) {
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existingByEmail.length > 0) {
      // Link firebaseUid to the existing user
      const user = existingByEmail[0];
      await db
        .update(users)
        .set({
          firebaseUid: body.firebaseUid,
          avatarUrl: user.avatarUrl ?? body.photoURL,
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        id: user.id,
        name: user.name,
        slug: user.slug,
        avatarUrl: user.avatarUrl ?? body.photoURL,
        role: user.role,
        firebaseUid: body.firebaseUid,
      });
    }
  }

  // 3. Create a new user
  const displayName = body.displayName ?? body.email ?? "Guest";
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || `user-${Date.now()}`;

  const [newUser] = await db
    .insert(users)
    .values({
      name: displayName,
      slug,
      avatarUrl: body.photoURL,
      role: "friend",
      firebaseUid: body.firebaseUid,
      email: body.email,
    })
    .returning();

  return NextResponse.json(
    {
      id: newUser.id,
      name: newUser.name,
      slug: newUser.slug,
      avatarUrl: newUser.avatarUrl,
      role: newUser.role,
      firebaseUid: newUser.firebaseUid,
    },
    { status: 201 }
  );
}
