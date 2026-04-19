export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  seasons,
  predictions,
  rankingPicks,
  titlePicks,
  actualTeamStandings,
  actualTitleSnapshots,
  scoreSnapshots,
  awards,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  calcUserScore,
  calcMonthlyChampions,
  type RankingPick,
  type TitlePick,
  type ActualStanding,
  type ActualTitle,
} from "@/lib/scoring";

/**
 * POST /api/admin/recalculate-scores?year=2026
 *
 * Recalculates all user scores for the given season based on
 * the latest actual standings and title snapshots.
 * Also determines monthly champions and writes awards.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  if (!yearParam) {
    return NextResponse.json(
      { error: "year query parameter is required" },
      { status: 400 }
    );
  }

  const year = parseInt(yearParam, 10);
  if (Number.isNaN(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  // 1. Find the season
  const [season] = await getDb()
    .select()
    .from(seasons)
    .where(eq(seasons.year, year));
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  // 2. Fetch latest actual standings (most recent snapshot)
  const latestStandings = await getDb()
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, season.id))
    .orderBy(desc(actualTeamStandings.snapshotDate));

  // Deduplicate: keep only the latest snapshot per league+team
  const standingsMap = new Map<string, ActualStanding & { rank: number }>();
  for (const row of latestStandings) {
    const key = `${row.league}:${row.teamName}`;
    if (!standingsMap.has(key)) {
      standingsMap.set(key, {
        league: row.league,
        rank: row.rank,
        teamName: row.teamName,
      });
    }
  }
  const currentStandings: ActualStanding[] = [...standingsMap.values()];

  // 3. Fetch latest actual titles
  const latestTitles = await getDb()
    .select()
    .from(actualTitleSnapshots)
    .where(eq(actualTitleSnapshots.seasonId, season.id))
    .orderBy(desc(actualTitleSnapshots.snapshotDate));

  const titlesMap = new Map<string, ActualTitle>();
  for (const row of latestTitles) {
    const key = `${row.league}:${row.category}`;
    if (!titlesMap.has(key)) {
      titlesMap.set(key, {
        league: row.league,
        category: row.category,
        playerName: row.playerName,
      });
    }
  }
  const currentTitles: ActualTitle[] = [...titlesMap.values()];

  // 4. Fetch all predictions with picks for this season
  const allPredictions = await getDb().query.predictions.findMany({
    where: eq(predictions.seasonId, season.id),
    with: {
      rankingPicks: true,
      titlePicks: true,
    },
  });

  // 5. Calculate scores for each user
  const now = new Date();
  const results = allPredictions.map((pred) => {
    const rPicks: RankingPick[] = pred.rankingPicks.map((rp) => ({
      league: rp.league,
      rank: rp.rank,
      teamName: rp.teamName,
    }));
    const tPicks: TitlePick[] = pred.titlePicks.map((tp) => ({
      league: tp.league,
      category: tp.category,
      playerName: tp.playerName,
    }));
    return calcUserScore(
      pred.userId,
      rPicks,
      tPicks,
      currentStandings,
      currentTitles
    );
  });

  // 6. Assign rank (1-based) by totalScore desc so clients can read rank from DB
  //    instead of recomputing client-side or relying on localStorage.
  const ranked = [...results]
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  // 7. Upsert score snapshots (insert new snapshot for today)
  for (const r of ranked) {
    await getDb().insert(scoreSnapshots).values({
      userId: r.userId,
      seasonId: season.id,
      rankingScore: r.rankingScore,
      titleScore: r.titleScore,
      totalScore: r.totalScore,
      rank: r.rank,
      snapshotDate: now,
    });
  }

  // 7. Calculate monthly champions from all historical snapshots
  const allSnapshots = await getDb()
    .select({
      userId: scoreSnapshots.userId,
      totalScore: scoreSnapshots.totalScore,
      snapshotDate: scoreSnapshots.snapshotDate,
    })
    .from(scoreSnapshots)
    .where(eq(scoreSnapshots.seasonId, season.id));

  const champions = calcMonthlyChampions(allSnapshots);

  // 8. Upsert monthly champion awards
  // Delete existing monthly_champion awards for this season, then re-insert
  await getDb()
    .delete(awards)
    .where(
      and(eq(awards.seasonId, season.id), eq(awards.type, "monthly_champion"))
    );

  for (const champ of champions) {
    await getDb().insert(awards).values({
      seasonId: season.id,
      userId: champ.userId,
      type: "monthly_champion",
      label: `${champ.month}月 月間王者`,
      month: champ.month,
    });
  }

  return NextResponse.json({
    season: { id: season.id, year: season.year },
    scores: results,
    monthlyChampions: champions,
    calculatedAt: now.toISOString(),
  });
}
