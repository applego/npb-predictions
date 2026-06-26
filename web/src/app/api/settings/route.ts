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

// Site-level theme settings live in site_settings (admin-controlled site default).
// Logged-in users can override theme + fonts via user_settings (overlays site default).
const DEFAULT_SETTINGS = {
  font_number: DEFAULT_NUMBER_FONT_ID,
  font_body: DEFAULT_BODY_FONT_ID,
  color_theme: DEFAULT_COLOR_THEME_ID,
};
// Keys a logged-in user may override for themselves (overlays the site default).
const USER_SETTING_KEYS = new Set(["font_number", "font_body", "color_theme"]);
// Keys an admin may set as the site-wide default (the released look).
const SITE_ALLOWED_KEYS = new Set(["color_theme", "font_number", "font_body"]);
// Keys that are ALWAYS site-scoped regardless of requested scope. None today:
// admin sets the default with an explicit scope:"site", users override per-account.
const SITE_ONLY_KEYS = new Set<string>([]);

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
  const body = (await req.json()) as {
    key: string;
    value: string;
    scope?: "site" | "user";
  };
  if (!body.key || !body.value) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }
  if (!isAllowedValue(body.key, body.value)) {
    return NextResponse.json({ error: `unsupported setting value for ${body.key}` }, { status: 400 });
  }

  // Everything defaults to per-user (theme + fonts) unless the caller explicitly
  // asks for the site-wide default with scope:"site" (admin only).
  const scope: "site" | "user" =
    SITE_ONLY_KEYS.has(body.key) || body.scope === "site" ? "site" : "user";

  if (scope === "site" && !SITE_ALLOWED_KEYS.has(body.key)) {
    return NextResponse.json({ error: `unsupported site setting key: ${body.key}` }, { status: 400 });
  }
  if (scope === "user" && !USER_SETTING_KEYS.has(body.key)) {
    return NextResponse.json({ error: `unsupported user setting key: ${body.key}` }, { status: 400 });
  }

  const db = getDb();
  try {
    if (scope === "site") {
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
