export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await getDb().select().from(users).orderBy(asc(users.id));
  return NextResponse.json(rows);
}
