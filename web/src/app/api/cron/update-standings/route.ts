export const runtime = "edge";

/**
 * POST /api/cron/update-standings
 *
 * Scrapes current NPB standings from npb.jp and saves a snapshot.
 * Then triggers score recalculation for all active seasons.
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var.
 *       Can also be called from admin UI with x-admin-token matching ADMIN_SECRET.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons, actualTeamStandings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeNpbStandings } from "@/lib/scrape-npb";

export async function POST(req: Request) {
  // Auth: accept either cron secret or admin secret
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  const incomingCron = req.headers.get("x-cron-secret");
  const incomingAdmin = req.headers.get("x-admin-secret");

  const authorized =
    (cronSecret && incomingCron === cronSecret) ||
    (adminSecret && incomingAdmin === adminSecret) ||
    // Allow if neither secret is configured (dev/local)
    (!cronSecret && !adminSecret);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Find active seasons
  const activeSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true));

  if (activeSeasons.length === 0) {
    return NextResponse.json({ message: "No active seasons", scraped: [] });
  }

  // Scrape NPB
  let standings;
  try {
    standings = await scrapeNpbStandings();
  } catch (err) {
    return NextResponse.json(
      { error: `Scrape failed: ${String(err)}` },
      { status: 502 }
    );
  }

  if (standings.length === 0) {
    return NextResponse.json(
      { error: "Scrape returned no standings (off-season?)" },
      { status: 422 }
    );
  }

  const now = new Date();
  const results = [];

  for (const season of activeSeasons) {
    await db.insert(actualTeamStandings).values(
      standings.map((s) => ({
        seasonId: season.id,
        league: s.league,
        rank: s.rank,
        teamName: s.teamName,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        isFinal: false,
        snapshotDate: now,
      }))
    );

    results.push({ year: season.year, rows: standings.length });
  }

  return NextResponse.json({
    scrapedAt: now.toISOString(),
    standings,
    seasons: results,
  });
}
