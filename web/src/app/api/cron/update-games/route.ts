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
import { withRetry, markSourceResolved } from "@/lib/scrape-retry";
import { checkCronAuth } from "@/lib/cron-auth";

function todayInJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return jst.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const { authorized } = checkCronAuth(req);
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

  const retry = await withRetry(() => scrapeYahooGames(date), {
    label: `yahoo-games:${date}`,
    attempts: 3,
    backoffMs: 500,
    db,
  });
  if (!retry.ok) {
    return NextResponse.json(
      { error: `Scrape failed: ${String(retry.error)}`, attempts: retry.attempts },
      { status: 502 },
    );
  }
  const games = retry.value;
  await markSourceResolved(db, `yahoo-games:${date}`);

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
