export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await getDb().select().from(seasons).orderBy(desc(seasons.year));
  return NextResponse.json(rows);
}
