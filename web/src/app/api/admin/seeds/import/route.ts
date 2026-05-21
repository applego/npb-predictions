export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-server";

interface SeedUser {
  name: string;
  slug: string;
  avatarUrl?: string;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
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
