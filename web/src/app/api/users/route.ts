import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(users).orderBy(asc(users.id));
  return NextResponse.json(rows);
}
