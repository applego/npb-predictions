export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyIdToken } from "@/lib/auth-server";

const BodySchema = z.object({
  // firebaseUid is no longer trusted from the body — we verify it against the token.
  // It's accepted for legacy compatibility but ignored.
  firebaseUid: z.string().optional(),
  email: z.string().email().nullable().optional(),
  displayName: z.string().max(200).nullable().optional(),
  photoURL: z.string().url().max(2048).nullable().optional(),
});

export async function POST(req: Request) {
  // 1. Verify the bearer token first — this is the only trusted source of firebaseUid.
  const token = await verifyIdToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized: valid Firebase ID token required" },
      { status: 401 }
    );
  }

  // 2. Parse + validate body.
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    body = BodySchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Token's uid is authoritative; body.firebaseUid is ignored.
  const firebaseUid = token.uid;
  const tokenEmail = token.email;
  const db = getDb();

  // 3. Already linked? Return existing user.
  const existingByUid = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, firebaseUid))
    .limit(1);

  if (existingByUid.length > 0) {
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

  // 4. Try to link by email — but ONLY if:
  //    a) the token's email is verified (otherwise an attacker could claim any email), and
  //    b) the existing row has no firebaseUid yet (otherwise we'd overwrite someone else's link).
  if (tokenEmail && token.emailVerified) {
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, tokenEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      const user = existingByEmail[0];
      if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
        // Refuse to overwrite an existing link — this would be account takeover.
        return NextResponse.json(
          { error: "This email is already linked to another account" },
          { status: 409 }
        );
      }
      if (!user.firebaseUid) {
        await db
          .update(users)
          .set({
            firebaseUid,
            avatarUrl: user.avatarUrl ?? body.photoURL ?? null,
          })
          .where(eq(users.id, user.id));
      }
      return NextResponse.json({
        id: user.id,
        name: user.name,
        slug: user.slug,
        avatarUrl: user.avatarUrl ?? body.photoURL ?? null,
        role: user.role,
        firebaseUid,
      });
    }
  }

  // 5. Create a new user. Use token email when available (verified or not — we still
  // need *some* identifier — but the firebaseUid is the real identity).
  const displayName =
    body.displayName?.trim() ||
    tokenEmail?.split("@")[0] ||
    `user-${firebaseUid.slice(0, 8)}`;

  const baseSlug =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `user-${firebaseUid.slice(0, 8)}`;

  // Ensure slug uniqueness with a short suffix derived from uid.
  const slug = `${baseSlug}-${firebaseUid.slice(0, 6)}`;

  const [newUser] = await db
    .insert(users)
    .values({
      name: displayName,
      slug,
      avatarUrl: body.photoURL ?? null,
      role: "friend",
      firebaseUid,
      email: tokenEmail,
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
