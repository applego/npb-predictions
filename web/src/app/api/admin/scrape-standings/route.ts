export const runtime = "edge";

/**
 * POST /api/admin/scrape-standings
 *
 * Scrapes current NPB standings from npb.jp, saves a snapshot for all
 * active seasons, and returns the scraped data.
 *
 * Called from the admin UI "NPBから自動取得" button.
 * No separate auth — admin UI itself requires Firebase login with admin UID.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons, actualTeamStandings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeNpbStandings } from "@/lib/scrape-npb";

export async function POST() {
  const db = getDb();

  const activeSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true));

  if (activeSeasons.length === 0) {
    return NextResponse.json(
      { error: "アクティブなシーズンがありません" },
      { status: 404 }
    );
  }

  let standings;
  try {
    standings = await scrapeNpbStandings();
  } catch (err) {
    return NextResponse.json(
      { error: `NPB.jpの取得に失敗しました: ${String(err)}` },
      { status: 502 }
    );
  }

  if (standings.length === 0) {
    return NextResponse.json(
      { error: "順位表が取得できませんでした（オフシーズン中の可能性があります）" },
      { status: 422 }
    );
  }

  const now = new Date();

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
  }

  return NextResponse.json({
    scrapedAt: now.toISOString(),
    standings,
    savedToSeasons: activeSeasons.map((s) => s.year),
  });
}
