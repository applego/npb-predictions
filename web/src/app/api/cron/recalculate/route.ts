export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  seasons,
  predictions,
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
 * POST /api/cron/recalculate
 *
 * Triggered daily by an external scheduler (e.g. Cloudflare Cron Trigger,
 * GitHub Actions cron, Vercel cron job).
 *
 * Authorization: header `x-cron-secret` must match env var CRON_SECRET.
 * If CRON_SECRET is not set, the endpoint is disabled.
 *
 * Body: optional JSON { year: number }
 *       If omitted, recalculates all active seasons.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron endpoint is disabled (CRON_SECRET not set)" }, { status: 503 });
  }

  const incoming = req.headers.get("x-cron-secret");
  if (incoming !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let targetYear: number | null = null;
  try {
    const body = await req.json() as { year?: number };
    if (typeof body.year === "number") targetYear = body.year;
  } catch {
    // Body is optional
  }

  // Load seasons to process
  const allSeasons = targetYear
    ? await getDb().select().from(seasons).where(eq(seasons.year, targetYear))
    : await getDb().select().from(seasons).where(eq(seasons.isActive, true));

  if (allSeasons.length === 0) {
    return NextResponse.json({ message: "No seasons to process", processed: [] });
  }

  const results = [];
  const now = new Date();

  for (const season of allSeasons) {
    // Fetch latest actual standings (most recent snapshot per team)
    const rawStandings = await getDb()
      .select()
      .from(actualTeamStandings)
      .where(eq(actualTeamStandings.seasonId, season.id))
      .orderBy(desc(actualTeamStandings.snapshotDate));

    const standingsMap = new Map<string, ActualStanding>();
    for (const row of rawStandings) {
      const key = `${row.league}:${row.teamName}`;
      if (!standingsMap.has(key)) {
        standingsMap.set(key, { league: row.league, rank: row.rank, teamName: row.teamName });
      }
    }
    const currentStandings: ActualStanding[] = [...standingsMap.values()];

    // Fetch latest actual titles
    const rawTitles = await getDb()
      .select()
      .from(actualTitleSnapshots)
      .where(eq(actualTitleSnapshots.seasonId, season.id))
      .orderBy(desc(actualTitleSnapshots.snapshotDate));

    const titlesMap = new Map<string, ActualTitle>();
    for (const row of rawTitles) {
      const key = `${row.league}:${row.category}`;
      if (!titlesMap.has(key)) {
        titlesMap.set(key, { league: row.league, category: row.category, playerName: row.playerName });
      }
    }
    const currentTitles: ActualTitle[] = [...titlesMap.values()];

    if (currentStandings.length === 0 && currentTitles.length === 0) {
      results.push({ year: season.year, skipped: true, reason: "No actual data" });
      continue;
    }

    // Fetch all predictions for this season
    const allPredictions = await getDb().query.predictions.findMany({
      where: eq(predictions.seasonId, season.id),
      with: { rankingPicks: true, titlePicks: true },
    });

    // Calculate scores
    const scores = allPredictions.map((pred) => {
      const rPicks: RankingPick[] = pred.rankingPicks.map((rp) => ({
        league: rp.league, rank: rp.rank, teamName: rp.teamName,
      }));
      const tPicks: TitlePick[] = pred.titlePicks.map((tp) => ({
        league: tp.league, category: tp.category, playerName: tp.playerName,
      }));
      return calcUserScore(pred.userId, rPicks, tPicks, currentStandings, currentTitles);
    });

    // Insert score snapshots
    for (const r of scores) {
      await getDb().insert(scoreSnapshots).values({
        userId: r.userId,
        seasonId: season.id,
        rankingScore: r.rankingScore,
        titleScore: r.titleScore,
        totalScore: r.totalScore,
        snapshotDate: now,
      });
    }

    // Recalculate monthly champions
    const allSnapshots = await getDb()
      .select({ userId: scoreSnapshots.userId, totalScore: scoreSnapshots.totalScore, snapshotDate: scoreSnapshots.snapshotDate })
      .from(scoreSnapshots)
      .where(eq(scoreSnapshots.seasonId, season.id));

    const champions = calcMonthlyChampions(allSnapshots);

    await getDb().delete(awards).where(
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

    results.push({
      year: season.year,
      usersRecalculated: scores.length,
      monthlyChampions: champions.length,
    });
  }

  return NextResponse.json({ calculatedAt: now.toISOString(), processed: results });
}
