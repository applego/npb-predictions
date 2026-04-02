export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";

interface SeedUser {
  name: string;
  slug: string;
  avatarUrl?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { users: SeedUser[] };

  const inserted = await getDb()
    .insert(users)
    .values(
      body.users.map((u) => ({
        name: u.name,
        slug: u.slug,
        avatarUrl: u.avatarUrl ?? null,
      }))
    )
    .onConflictDoNothing({ target: users.slug })
    .returning();

  return NextResponse.json({ imported: inserted.length, users: inserted });
}
