export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import {
  BODY_FONTS,
  COLOR_THEMES,
  DEFAULT_BODY_FONT_ID,
  DEFAULT_COLOR_THEME_ID,
  DEFAULT_NUMBER_FONT_ID,
  NUMBER_FONTS,
} from "@/lib/theme-presets";
import { requireAdmin, requireAuth } from "@/lib/auth-server";

// Site-level theme settings live in site_settings.
// Logged-in users can override fonts only via user_settings.
const DEFAULT_SETTINGS = {
  font_number: DEFAULT_NUMBER_FONT_ID,
  font_body: DEFAULT_BODY_FONT_ID,
  color_theme: DEFAULT_COLOR_THEME_ID,
};
const USER_SETTING_KEYS = new Set(["font_number", "font_body"]);
const SITE_SETTING_KEYS = new Set(["color_theme"]);

function hasBearerToken(req: Request): boolean {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  return !!header?.toLowerCase().startsWith("bearer ");
}

function isAllowedValue(key: string, value: string): boolean {
  if (key === "font_number") return NUMBER_FONTS.some((f) => f.id === value);
  if (key === "font_body") return BODY_FONTS.some((f) => f.id === value);
  if (key === "color_theme") return COLOR_THEMES.some((t) => t.id === value);
  return false;
}

export async function GET(req: Request) {
  const db = getDb();
  try {
    const rows = await db.all<{ key: string; value: string }>(
      sql`SELECT key, value FROM site_settings`
    );
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    const response = { ...DEFAULT_SETTINGS, ...settings };

    if (hasBearerToken(req)) {
      const auth = await requireAuth(req);
      if (auth instanceof Response) return auth;
      const userRows = await db.all<{ key: string; value: string }>(
        sql`SELECT key, value FROM user_settings WHERE user_id = ${auth.user.id}`
      );
      for (const row of userRows) {
        if (USER_SETTING_KEYS.has(row.key) && isAllowedValue(row.key, row.value)) {
          response[row.key as keyof typeof response] = row.value;
        }
      }
    }

    return NextResponse.json(response);
  } catch {
    // Table might not exist yet
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as { key: string; value: string };
  if (!body.key || !body.value) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }
  if (!USER_SETTING_KEYS.has(body.key) && !SITE_SETTING_KEYS.has(body.key)) {
    return NextResponse.json({ error: `unsupported setting key: ${body.key}` }, { status: 400 });
  }
  if (!isAllowedValue(body.key, body.value)) {
    return NextResponse.json({ error: `unsupported setting value for ${body.key}` }, { status: 400 });
  }

  const db = getDb();
  try {
    if (SITE_SETTING_KEYS.has(body.key)) {
      const auth = await requireAdmin(req);
      if (auth instanceof Response) return auth;
      await db.run(
        sql`INSERT OR REPLACE INTO site_settings (key, value, updated_at) VALUES (${body.key}, ${body.value}, unixepoch())`
      );
      return NextResponse.json({ ok: true, scope: "site", key: body.key, value: body.value });
    }

    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;
    await db.run(
      sql`INSERT OR REPLACE INTO user_settings (user_id, key, value, updated_at) VALUES (${auth.user.id}, ${body.key}, ${body.value}, unixepoch())`
    );
    return NextResponse.json({ ok: true, scope: "user", key: body.key, value: body.value });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
