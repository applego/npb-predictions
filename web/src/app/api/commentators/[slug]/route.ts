export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  users,
  seasons,
  predictions,
  rankingPicks,
  titlePicks,
  actualTeamStandings,
  actualTitleSnapshots,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";

/**
 * GET /api/commentators/[slug]?year=2025
 *
 * Returns commentator info + predictions with score breakdown per season.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");

  const db = getDb();

  // Find user by slug
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.slug, slug), eq(users.role, "commentator")));
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get all seasons
  const allSeasons = await db.select().from(seasons);
  const seasonMap = new Map(allSeasons.map((s) => [s.id, s]));

  // Get user's predictions
  const userPreds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, user.id));

  // Filter by year if specified
  const targetPreds = yearParam
    ? userPreds.filter((p) => {
        const s = seasonMap.get(p.seasonId);
        return s && s.year === parseInt(yearParam, 10);
      })
    : userPreds;

  // Years with predictions
  const yearsWithData = [
    ...new Set(
      userPreds
        .map((p) => seasonMap.get(p.seasonId)?.year)
        .filter((y): y is number => y !== undefined)
    ),
  ].sort((a, b) => b - a);

  // Get all ranking & title picks for target predictions
  const predIds = targetPreds.map((p) => p.id);
  const allRankingPicks = await db.select().from(rankingPicks);
  const allTitlePicks = await db.select().from(titlePicks);

  const picksByPred = new Map<
    number,
    { ranking: (typeof allRankingPicks)[0][]; title: (typeof allTitlePicks)[0][] }
  >();
  for (const rp of allRankingPicks) {
    if (!predIds.includes(rp.predictionId)) continue;
    const entry = picksByPred.get(rp.predictionId) ?? { ranking: [], title: [] };
    entry.ranking.push(rp);
    picksByPred.set(rp.predictionId, entry);
  }
  for (const tp of allTitlePicks) {
    if (!predIds.includes(tp.predictionId)) continue;
    const entry = picksByPred.get(tp.predictionId) ?? { ranking: [], title: [] };
    entry.title.push(tp);
    picksByPred.set(tp.predictionId, entry);
  }

  // Build season data
  const seasonData = [];
  for (const pred of targetPreds) {
    const season = seasonMap.get(pred.seasonId);
    if (!season) continue;

    const picks = picksByPred.get(pred.id) ?? { ranking: [], title: [] };

    // Fetch actual standings for this season
    const standings = await db
      .select()
      .from(actualTeamStandings)
      .where(eq(actualTeamStandings.seasonId, season.id))
      .orderBy(desc(actualTeamStandings.snapshotDate));

    // Build latest actual rank map: league:teamName -> rank
    const actualRankMap = new Map<string, number>();
    for (const row of standings) {
      const key = `${row.league}:${row.teamName}`;
      if (!actualRankMap.has(key)) {
        actualRankMap.set(key, row.rank);
      }
    }

    // Build actual rank-to-team map: league:rank -> teamName
    const actualTeamByRank = new Map<string, string>();
    for (const row of standings) {
      const key = `${row.league}:${row.rank}`;
      if (!actualTeamByRank.has(key)) {
        actualTeamByRank.set(key, row.teamName);
      }
    }

    // Fetch actual titles
    const titles = await db
      .select()
      .from(actualTitleSnapshots)
      .where(eq(actualTitleSnapshots.seasonId, season.id))
      .orderBy(desc(actualTitleSnapshots.snapshotDate));

    const actualTitleMap = new Map<string, string>();
    for (const row of titles) {
      const key = `${row.league}:${row.category}`;
      if (!actualTitleMap.has(key)) {
        actualTitleMap.set(key, row.playerName);
      }
    }

    // Compute ranking details
    const centralPicks = picks.ranking
      .filter((p) => p.league === "central")
      .sort((a, b) => a.rank - b.rank);
    const pacificPicks = picks.ranking
      .filter((p) => p.league === "pacific")
      .sort((a, b) => a.rank - b.rank);

    let rankingScore = 0;
    const centralDetails = centralPicks.map((pick) => {
      const actualRank = actualRankMap.get(`central:${pick.teamName}`);
      const score =
        actualRank !== undefined
          ? calcRankingPointForTeam(pick.rank, actualRank)
          : 0;
      rankingScore += score;
      return {
        rank: pick.rank,
        predictedTeam: pick.teamName,
        actualTeam: actualTeamByRank.get(`central:${pick.rank}`) ?? "",
        actualRank: actualRank ?? null,
        score,
      };
    });

    const pacificDetails = pacificPicks.map((pick) => {
      const actualRank = actualRankMap.get(`pacific:${pick.teamName}`);
      const score =
        actualRank !== undefined
          ? calcRankingPointForTeam(pick.rank, actualRank)
          : 0;
      rankingScore += score;
      return {
        rank: pick.rank,
        predictedTeam: pick.teamName,
        actualTeam: actualTeamByRank.get(`pacific:${pick.rank}`) ?? "",
        actualRank: actualRank ?? null,
        score,
      };
    });

    // Compute title details
    let titleScore = 0;
    const titleDetails = picks.title.map((pick) => {
      const actualPlayer = actualTitleMap.get(`${pick.league}:${pick.category}`);
      const hit =
        actualPlayer !== undefined &&
        pick.playerName.trim().toLowerCase() ===
          actualPlayer.trim().toLowerCase();
      const score = hit ? 3 : 0;
      titleScore += score;
      return {
        league: pick.league,
        category: pick.category,
        predictedPlayer: pick.playerName,
        actualPlayer: actualPlayer ?? null,
        hit,
        score,
      };
    });

    seasonData.push({
      year: season.year,
      variant: pred.variant,
      rankingScore,
      titleScore,
      totalScore: rankingScore + titleScore,
      centralDetails,
      pacificDetails,
      titleDetails,
    });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      slug: user.slug,
      role: user.role,
      source: user.source,
      sourceUrl: user.sourceUrl,
      avatarUrl: user.avatarUrl,
    },
    yearsWithData,
    seasons: seasonData,
  });
}
