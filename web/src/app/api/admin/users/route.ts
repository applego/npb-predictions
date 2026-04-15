export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  const rows = await getDb().select().from(users).orderBy(asc(users.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
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
