export const runtime = "edge";

/**
 * POST /api/cron/update-titles
 *
 * Scrape タイトル上位3名 (打率/本塁打/打点/勝利/防御率/セーブ) from npb.jp
 * and persist into actual_title_snapshots.
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var,
 *       or x-admin-secret header must match ADMIN_SECRET.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons, actualTitleSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeNpbTitles } from "@/lib/scrape-titles";
import { withRetry, markSourceResolved } from "@/lib/scrape-retry";
import { checkCronAuth } from "@/lib/cron-auth";

export async function POST(req: Request) {
  const { authorized } = checkCronAuth(req);
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

  const results = [];
  for (const season of activeSeasons) {
    const retry = await withRetry(() => scrapeNpbTitles(season.year), {
      label: `npb-titles:${season.year}`,
      attempts: 3,
      backoffMs: 500,
      db,
    });
    if (!retry.ok) {
      results.push({
        year: season.year,
        error: String(retry.error),
        inserted: 0,
        attempts: retry.attempts,
      });
      continue;
    }
    const titles = retry.value;
    await markSourceResolved(db, `npb-titles:${season.year}`);

    if (titles.length === 0) {
      results.push({ year: season.year, inserted: 0, note: "No titles scraped (off-season?)" });
      continue;
    }

    // Only keep rank=1 for snapshot (actual_title_snapshots stores just the leader)
    const leaders = titles.filter((t) => t.rank === 1);

    await db
      .insert(actualTitleSnapshots)
      .values(
        leaders.map((t) => ({
          seasonId: season.id,
          league: t.league,
          category: t.category,
          playerName: t.playerName,
          teamName: t.teamName,
          value: t.value,
          isFinal: false,
        })),
      )
      .onConflictDoNothing();

    results.push({
      year: season.year,
      inserted: leaders.length,
      top3Count: titles.length,
    });
  }

  return NextResponse.json({
    scrapedAt: new Date().toISOString(),
    seasons: results,
  });
}
