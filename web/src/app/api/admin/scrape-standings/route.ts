export const runtime = "edge";

/**
 * POST /api/admin/scrape-standings
 *
 * Scrapes current NPB standings from npb.jp, saves a snapshot for all
 * active seasons, and returns the scraped data.
 *
 * Called from the admin UI "NPBから自動取得" button.
 * Requires a verified Firebase ID Token belonging to an admin UID.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons, actualTeamStandings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeNpbStandings } from "@/lib/scrape-npb";
import { requireAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
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

  // 複数 active シーズンがある場合は最新 year を採用する
  const latestActive = activeSeasons.sort((a, b) => b.year - a.year)[0];

  await db
    .insert(actualTeamStandings)
    .values(
      standings.map((s) => ({
        seasonId: latestActive.id,
        league: s.league,
        rank: s.rank,
        teamName: s.teamName,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        isFinal: false,
        snapshotDate: now,
      }))
    )
    .onConflictDoNothing();

  return NextResponse.json({
    scrapedAt: now.toISOString(),
    standings,
    savedToSeason: latestActive.year,
  });
}
