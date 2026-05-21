export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-server";

// Returns the list of registered users. Authentication required; sensitive
// columns (email, firebaseUid, source, sourceUrl) are never exposed.
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      slug: users.slug,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(users)
    .orderBy(asc(users.id));
  return NextResponse.json(rows);
}
