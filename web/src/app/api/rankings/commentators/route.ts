export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  users,
  seasons,
  predictions,
  rankingPicks,
  scoreSnapshots,
  actualTeamStandings,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";

/**
 * GET /api/rankings/commentators?year=2025&league=all
 *
 * Returns commentator rankings with score breakdowns and prediction details.
 * - year: 2023 | 2024 | 2025 (required)
 * - league: central | pacific | all (default: all)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const leagueParam = searchParams.get("league") ?? "all";

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

  if (!["all", "central", "pacific"].includes(leagueParam)) {
    return NextResponse.json(
      { error: "league must be central, pacific, or all" },
      { status: 400 }
    );
  }

  const db = getDb();

  // 1. Find the season
  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, year));

  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  // 2. Fetch commentator users with their latest score snapshots
  const commentatorScores = await db
    .select({
      userId: users.id,
      userName: users.name,
      userSlug: users.slug,
      userSource: users.source,
      userVariant: users.variant,
      rankingScore: scoreSnapshots.rankingScore,
      titleScore: scoreSnapshots.titleScore,
      totalScore: scoreSnapshots.totalScore,
      snapshotDate: scoreSnapshots.snapshotDate,
    })
    .from(users)
    .innerJoin(
      scoreSnapshots,
      and(
        eq(scoreSnapshots.userId, users.id),
        eq(scoreSnapshots.seasonId, season.id)
      )
    )
    .where(eq(users.role, "commentator"))
    .orderBy(desc(scoreSnapshots.totalScore));

  // Deduplicate: keep only latest snapshot per user
  const seenUsers = new Set<number>();
  const latestScores = commentatorScores.filter((row) => {
    if (seenUsers.has(row.userId)) return false;
    seenUsers.add(row.userId);
    return true;
  });

  // 3. Fetch actual standings for this season (latest final or most recent)
  const allStandings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, season.id))
    .orderBy(desc(actualTeamStandings.snapshotDate));

  // Deduplicate: keep only the latest snapshot per league+rank
  const standingsMap = new Map<
    string,
    { league: string; rank: number; teamName: string }
  >();
  for (const row of allStandings) {
    const key = `${row.league}:${row.rank}`;
    if (!standingsMap.has(key)) {
      standingsMap.set(key, {
        league: row.league,
        rank: row.rank,
        teamName: row.teamName,
      });
    }
  }

  const actualCentral = Array.from(standingsMap.values())
    .filter((s) => s.league === "central")
    .sort((a, b) => a.rank - b.rank);
  const actualPacific = Array.from(standingsMap.values())
    .filter((s) => s.league === "pacific")
    .sort((a, b) => a.rank - b.rank);

  // 4. For each commentator, fetch their ranking picks and compute per-league scores
  const userIds = latestScores.map((s) => s.userId);

  // Fetch all predictions for these users in this season
  const allPredictions = userIds.length > 0
    ? await db
        .select()
        .from(predictions)
        .where(eq(predictions.seasonId, season.id))
    : [];

  // Filter to only commentator predictions
  const commentatorPredictions = allPredictions.filter((p) =>
    userIds.includes(p.userId)
  );

  // Fetch all ranking picks for those predictions
  const predictionIds = commentatorPredictions.map((p) => p.id);
  const allRankingPicks =
    predictionIds.length > 0
      ? await db.select().from(rankingPicks)
      : [];

  // Filter to only relevant prediction IDs
  const relevantPicks = allRankingPicks.filter((rp) =>
    predictionIds.includes(rp.predictionId)
  );

  // Build a lookup: userId -> prediction picks
  const predByUser = new Map<number, number>(); // userId -> predictionId
  for (const p of commentatorPredictions) {
    predByUser.set(p.userId, p.id);
  }

  const picksByPrediction = new Map<
    number,
    Array<{ league: string; rank: number; teamName: string }>
  >();
  for (const rp of relevantPicks) {
    const existing = picksByPrediction.get(rp.predictionId) ?? [];
    existing.push({
      league: rp.league,
      rank: rp.rank,
      teamName: rp.teamName,
    });
    picksByPrediction.set(rp.predictionId, existing);
  }

  // Build actual rank lookup for score calculation: teamName -> actualRank per league
  const centralRankMap = new Map<string, number>();
  for (const s of actualCentral) {
    centralRankMap.set(s.teamName, s.rank);
  }
  const pacificRankMap = new Map<string, number>();
  for (const s of actualPacific) {
    pacificRankMap.set(s.teamName, s.rank);
  }

  // 5. Build response
  const commentators = latestScores.map((row, idx) => {
    const predId = predByUser.get(row.userId);
    const picks = predId ? picksByPrediction.get(predId) ?? [] : [];

    const centralPicks = picks
      .filter((p) => p.league === "central")
      .sort((a, b) => a.rank - b.rank);
    const pacificPicks = picks
      .filter((p) => p.league === "pacific")
      .sort((a, b) => a.rank - b.rank);

    // Compute per-league scores
    let centralScore = 0;
    let pacificScore = 0;

    const centralDetails = centralPicks.map((pick) => {
      const actualRank = centralRankMap.get(pick.teamName);
      const score =
        actualRank !== undefined
          ? calcRankingPointForTeam(pick.rank, actualRank)
          : 0;
      centralScore += score;
      return {
        rank: pick.rank,
        predictedTeam: pick.teamName,
        actualTeam:
          actualCentral.find((a) => a.rank === pick.rank)?.teamName ?? "",
        actualRank: actualRank ?? null,
        diff: actualRank !== undefined ? Math.abs(pick.rank - actualRank) : null,
        score,
      };
    });

    const pacificDetails = pacificPicks.map((pick) => {
      const actualRank = pacificRankMap.get(pick.teamName);
      const score =
        actualRank !== undefined
          ? calcRankingPointForTeam(pick.rank, actualRank)
          : 0;
      pacificScore += score;
      return {
        rank: pick.rank,
        predictedTeam: pick.teamName,
        actualTeam:
          actualPacific.find((a) => a.rank === pick.rank)?.teamName ?? "",
        actualRank: actualRank ?? null,
        diff: actualRank !== undefined ? Math.abs(pick.rank - actualRank) : null,
        score,
      };
    });

    // Determine effective total for league filter
    let effectiveTotal = row.totalScore;
    if (leagueParam === "central") {
      effectiveTotal = centralScore;
    } else if (leagueParam === "pacific") {
      effectiveTotal = pacificScore;
    }

    return {
      userId: row.userId,
      name: row.userName,
      slug: row.userSlug,
      source: row.userSource,
      variant: row.userVariant,
      centralScore,
      pacificScore,
      rankingScore: row.rankingScore,
      titleScore: row.titleScore,
      totalScore: row.totalScore,
      effectiveTotal,
      centralDetails,
      pacificDetails,
    };
  });

  // Re-sort by effectiveTotal for the chosen league filter
  commentators.sort((a, b) => b.effectiveTotal - a.effectiveTotal);

  // Assign ranks after sorting
  const ranked = commentators.map((c, idx) => ({
    ...c,
    rank: idx + 1,
  }));

  return NextResponse.json({
    season: { id: season.id, year: season.year },
    league: leagueParam,
    actualCentral,
    actualPacific,
    totalCommentators: ranked.length,
    commentators: ranked,
  });
}
