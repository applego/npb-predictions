export const runtime = "edge";

/**
 * POST /api/cron/update-standings
 *
 * Scrapes current NPB standings (Yahoo Sports Navi → npb.jp fallback),
 * detects rank changes vs the latest snapshot, and saves a new snapshot
 * only when something actually changed.
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var.
 *       Can also be called from admin UI with x-admin-secret matching ADMIN_SECRET.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons, actualTeamStandings } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { scrapeNpbStandings, type ScrapedStanding } from "@/lib/scrape-npb";
import { scrapeYahooStandings } from "@/lib/scrape-yahoo";
import { diffStandings } from "@/lib/rank-diff";
import { withRetry, markSourceResolved, logScrapeFailure } from "@/lib/scrape-retry";
import type { DbClient } from "@/db";

async function scrapeWithFallback(db: DbClient): Promise<{
  source: "yahoo" | "npb";
  standings: ScrapedStanding[];
  errors: string[];
  attempts: { yahoo: number; npb: number };
}> {
  const errors: string[] = [];

  const yahooRetry = await withRetry(
    async () => {
      const rows = await scrapeYahooStandings();
      if (rows.length < 12) throw new Error(`Yahoo returned only ${rows.length} rows`);
      return rows;
    },
    { label: "yahoo-standings", attempts: 2, backoffMs: 300, db },
  );
  if (yahooRetry.ok) {
    await markSourceResolved(db, "yahoo-standings");
    return {
      source: "yahoo",
      standings: yahooRetry.value,
      errors,
      attempts: { yahoo: yahooRetry.attempts, npb: 0 },
    };
  }
  errors.push(`Yahoo: ${String(yahooRetry.error)}`);

  const npbRetry = await withRetry(() => scrapeNpbStandings(), {
    label: "npb-standings",
    attempts: 3,
    backoffMs: 500,
    db,
  });
  if (!npbRetry.ok) {
    errors.push(`npb.jp: ${String(npbRetry.error)}`);
    await logScrapeFailure(db, "npb-standings-fallback-exhausted", npbRetry.error);
    throw new Error(errors.join("; "));
  }
  await markSourceResolved(db, "npb-standings");
  return {
    source: "npb",
    standings: npbRetry.value,
    errors,
    attempts: { yahoo: yahooRetry.attempts, npb: npbRetry.attempts },
  };
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

  const db = getDb();

  const activeSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true));

  if (activeSeasons.length === 0) {
    return NextResponse.json({ message: "No active seasons", scraped: [] });
  }

  let scrape;
  try {
    scrape = await scrapeWithFallback(db);
  } catch (err) {
    return NextResponse.json(
      { error: `Scrape failed: ${String(err)}` },
      { status: 502 },
    );
  }

  if (scrape.standings.length === 0) {
    return NextResponse.json(
      { error: "Scrape returned no standings (off-season?)", sourceErrors: scrape.errors },
      { status: 422 },
    );
  }

  const now = new Date();
  const results = [];

  for (const season of activeSeasons) {
    // Fetch the latest snapshot per team for diff
    const latestRows = await db
      .select()
      .from(actualTeamStandings)
      .where(eq(actualTeamStandings.seasonId, season.id))
      .orderBy(desc(actualTeamStandings.snapshotDate))
      .limit(24); // 12 teams × up to 2 most recent snapshots

    // Keep only the most recent row per (league, teamName)
    const latestPerTeam = new Map<string, typeof latestRows[number]>();
    for (const r of latestRows) {
      const key = `${r.league}:${r.teamName}`;
      if (!latestPerTeam.has(key)) latestPerTeam.set(key, r);
    }
    const prev = [...latestPerTeam.values()].map((r) => ({
      league: r.league as "central" | "pacific",
      rank: r.rank,
      teamName: r.teamName,
    }));

    const diff = diffStandings(prev, scrape.standings);

    // Only insert a new snapshot if something changed OR this is the first snapshot
    const shouldInsert = prev.length === 0 || diff.changed.length > 0;

    if (shouldInsert) {
      await db
        .insert(actualTeamStandings)
        .values(
          scrape.standings.map((s) => ({
            seasonId: season.id,
            league: s.league,
            rank: s.rank,
            teamName: s.teamName,
            wins: s.wins,
            losses: s.losses,
            draws: s.draws,
            isFinal: false,
            snapshotDate: now,
          })),
        )
        .onConflictDoNothing();
    }

    results.push({
      year: season.year,
      rows: scrape.standings.length,
      inserted: shouldInsert,
      changed: diff.changed.length,
      topMoves: diff.topMoves.map((m) => ({
        league: m.league,
        team: m.teamName,
        prev: m.prevRank,
        now: m.newRank,
        delta: m.delta,
      })),
    });
  }

  return NextResponse.json({
    scrapedAt: now.toISOString(),
    source: scrape.source,
    sourceErrors: scrape.errors,
    standings: scrape.standings,
    seasons: results,
  });
}
