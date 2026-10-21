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
import { desc, eq } from "drizzle-orm";
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

  if (activeSeasons.length !== 1) return NextResponse.json({ error: "Exactly one active season required" }, { status: 409 });
  const latestActive = activeSeasons[0];
  let standings;
  try {
    standings = await scrapeNpbStandings(latestActive.year);
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

  const previous = await db.select().from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, latestActive.id))
    .orderBy(desc(actualTeamStandings.snapshotDate)).limit(24);
  if (previous.some((row) => row.isFinal && standings.some((incoming) => incoming.league === row.league && !incoming.isFinal))) {
    return NextResponse.json({ error: "Refusing to replace final standings with provisional data" }, { status: 409 });
  }
  const now = new Date();

  const rows = standings.map((standing) => ({
    seasonId: latestActive.id, league: standing.league, rank: standing.rank,
    teamName: standing.teamName, wins: standing.wins, losses: standing.losses,
    draws: standing.draws, isFinal: standing.isFinal === true, snapshotDate: now,
  }));
  await db.batch([
    db.insert(actualTeamStandings).values(rows.slice(0, 8)).onConflictDoNothing(),
    db.insert(actualTeamStandings).values(rows.slice(8)).onConflictDoNothing(),
  ]);

  return NextResponse.json({
    scrapedAt: now.toISOString(),
    standings,
    savedToSeason: latestActive.year,
  });
}
