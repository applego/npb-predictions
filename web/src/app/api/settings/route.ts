export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import {
  DEFAULT_BODY_FONT_ID,
  DEFAULT_COLOR_THEME_ID,
  DEFAULT_NUMBER_FONT_ID,
} from "@/lib/theme-presets";
import { requireAdmin } from "@/lib/auth-server";

// Simple key-value settings stored in site_settings table
const DEFAULT_SETTINGS = {
  font_number: DEFAULT_NUMBER_FONT_ID,
  font_body: DEFAULT_BODY_FONT_ID,
  color_theme: DEFAULT_COLOR_THEME_ID,
};
const ALLOWED_SETTING_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

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
    return NextResponse.json({ ...DEFAULT_SETTINGS, ...settings });
  } catch {
    // Table might not exist yet
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  const body = (await req.json()) as { key: string; value: string };
  if (!body.key || !body.value) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }
  if (!ALLOWED_SETTING_KEYS.has(body.key)) {
    return NextResponse.json({ error: `unsupported setting key: ${body.key}` }, { status: 400 });
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
