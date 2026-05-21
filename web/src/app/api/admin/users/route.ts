export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-server";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const rows = await getDb().select().from(users).orderBy(asc(users.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const body = (await req.json()) as {
    name: string;
    slug: string;
    avatarUrl?: string;
    sourceUrl?: string;
  };

  if (!body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 }
    );
  }

  const [user] = await getDb()
    .insert(users)
    .values({
      name: body.name.trim(),
      slug: body.slug.trim(),
      avatarUrl: body.avatarUrl?.trim() || null,
      sourceUrl: body.sourceUrl?.trim() || null,
    })
    .onConflictDoNothing({ target: users.slug })
    .returning();

  if (!user) {
    return NextResponse.json(
      { error: `slug "${body.slug}" is already taken` },
      { status: 409 }
    );
  }

  return NextResponse.json(user, { status: 201 });
}
