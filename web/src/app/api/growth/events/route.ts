export const runtime = "edge";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { growthEvents } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-server";

const payload = z.object({
  id: z.string().uuid(), session: z.string().uuid(),
  event: z.enum(["result_view", "x_share_start", "card_download"]),
  year: z.number().int().min(1936).max(2100),
  league: z.enum(["central", "pacific", "all"]), source: z.enum(["x", "other"]),
}).strict();
let lastPrunedDay = "";
const buckets = new Map<string, { count: number; until: number }>();
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) return new Response(null, { status: 403 });
  const now = Date.now();
  for (const [key, row] of buckets) if (row.until <= now) buckets.delete(key);
  const ip = req.headers.get("cf-connecting-ip") ?? "anonymous";
  if (!buckets.has(ip) && buckets.size >= 10_000) return new Response(null, { status: 429 });
  const bucket = buckets.get(ip) ?? { count: 0, until: now + 60_000 };
  bucket.count++; buckets.set(ip, bucket);
  if (bucket.count > 60) return new Response(null, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > 1024) return new Response(null, { status: 413 });
  const body = await req.text();
  if (body.length > 1024) return new Response(null, { status: 413 });
  let input: z.infer<typeof payload>;
  try { input = payload.parse(JSON.parse(body)); } catch { return new Response(null, { status: 400 }); }
  const day = new Date(now).toISOString().slice(0, 10);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}:${input.session}`));
  const sessionHash = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  try {
    const db = getDb();
    if (lastPrunedDay !== day) {
      await db.delete(growthEvents).where(sql`${growthEvents.day} < date('now', '-90 days')`);
      lastPrunedDay = day;
    }
    await db.insert(growthEvents).values({ id: input.id, day, sessionHash, event: input.event, year: input.year, league: input.league, source: input.source }).onConflictDoNothing();
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 503 }); }
}
/** Read-only aggregate; never exposes random tab tokens or individual events. */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const rows = await getDb().all(sql`SELECT day, event, source, year, league, count(*) AS events, count(DISTINCT session_hash) AS tabs FROM growth_events WHERE day >= date('now', '-27 days') GROUP BY day, event, source, year, league ORDER BY day DESC`);
  return NextResponse.json({ windowDays: 28, unit: "daily anonymous tabs; not unique people", rows, observedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
