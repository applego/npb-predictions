export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

// Simple key-value settings stored in site_settings table

export async function GET() {
  const db = getDb();
  try {
    const rows = await db.all<{ key: string; value: string }>(
      sql`SELECT key, value FROM site_settings`
    );
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch {
    // Table might not exist yet
    return NextResponse.json({ font_preset: "A" });
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as { key: string; value: string };
  if (!body.key || !body.value) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const db = getDb();
  try {
    await db.run(
      sql`INSERT OR REPLACE INTO site_settings (key, value, updated_at) VALUES (${body.key}, ${body.value}, unixepoch())`
    );
    return NextResponse.json({ ok: true, key: body.key, value: body.value });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
