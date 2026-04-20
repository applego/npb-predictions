export const runtime = "edge";

/**
 * POST /api/cron/update-games?date=YYYY-MM-DD
 *
 * Scrape NPB game results for the given date (default: today JST) and upsert
 * into game_results. Idempotent (unique index on season+date+home+away).
 *
 * Auth: x-cron-secret header or x-admin-secret.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons, gameResults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeYahooGames } from "@/lib/scrape-games";

function todayInJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return jst.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;
  const incomingCron = req.headers.get("x-cron-secret");
  const incomingAdmin = req.headers.get("x-admin-secret");

  const authorized =
    (cronSecret && incomingCron === cronSecret) ||
    (adminSecret && incomingAdmin === adminSecret) ||
    (!cronSecret && !adminSecret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? todayInJst();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format (YYYY-MM-DD)" }, { status: 400 });
  }

  const db = getDb();
  const activeSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true));

  if (activeSeasons.length === 0) {
    return NextResponse.json({ message: "No active seasons" });
  }

  let games;
  try {
    games = await scrapeYahooGames(date);
  } catch (err) {
    return NextResponse.json({ error: `Scrape failed: ${String(err)}` }, { status: 502 });
  }

  if (games.length === 0) {
    return NextResponse.json({ date, games: 0, note: "No games on this date" });
  }

  const now = new Date();
  const results = [];
  for (const season of activeSeasons) {
    await db
      .insert(gameResults)
      .values(
        games.map((g) => ({
          seasonId: season.id,
          gameDate: g.gameDate,
          league: g.league,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          status: g.status,
          winner: g.winner,
          stadium: g.stadium,
          snapshotDate: now,
        })),
      )
      .onConflictDoNothing();

    results.push({ year: season.year, inserted: games.length });
  }

  return NextResponse.json({
    scrapedAt: now.toISOString(),
    date,
    games,
    seasons: results,
  });
}
