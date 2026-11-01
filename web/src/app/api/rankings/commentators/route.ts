export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb, type DbClient } from "@/db";
import { getOrCompute, PUBLIC_CACHE_HEADERS } from "@/lib/computed-cache";
import { users, seasons, predictions, rankingPicks, actualTeamStandings } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";
import { exportPublicResults } from "@/lib/public-results-export";

const DEFAULT_YEAR = 2026;

/**
 * GET /api/rankings/commentators?year=2025&league=all
 *
 * Computes commentator rankings on the fly from ranking_picks + actualTeamStandings.
 * No dependency on pre-computed scoreSnapshots.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const leagueParam = searchParams.get("league") ?? "all";
  const format = searchParams.get("format");

  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
  if ((yearParam !== null && !/^\d{4}$/.test(yearParam)) || !Number.isInteger(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  if (format !== null && format !== "archive") return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  if (!["all", "central", "pacific"].includes(leagueParam) || (format === "archive" && leagueParam !== "all")) {
    return NextResponse.json({ error: "Archive requires league=all; rankings require a valid league" }, { status: 400 });
  }
  if (format === "archive") {
    const source = new URL(req.url);
    source.search = new URLSearchParams({ year: String(year), league: "all", format: "archive" }).toString();
    try {
      const data = await exportPublicResults(year, source.href);
      return NextResponse.json(data ?? { error: "Season not found" }, {
        status: data ? 200 : 404, headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return NextResponse.json({ error: "Public results export unavailable; retry after source recovery" }, {
        status: 503, headers: { "Cache-Control": "no-store" },
      });
    }
  }

  const db = getDb();
  const body = await getOrCompute(db, `rankings:commentators:${year}:${leagueParam}`, () => computeCommentatorRankings(db, year, leagueParam), { year });
  if (!body) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }
  return NextResponse.json(body, { headers: PUBLIC_CACHE_HEADERS });
}

async function computeCommentatorRankings(db: DbClient, year: number, leagueParam: string) {
  // 1. Find season
  const [season] = await db.select().from(seasons).where(eq(seasons.year, year));
  if (!season) return null;

  // 2. Fetch actual standings
  const allStandings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, season.id))
    .orderBy(desc(actualTeamStandings.snapshotDate));

  const standingsMap = new Map<string, { league: string; rank: number; teamName: string }>();
  for (const row of allStandings) {
    const key = `${row.league}:${row.rank}`;
    if (!standingsMap.has(key)) {
      standingsMap.set(key, { league: row.league, rank: row.rank, teamName: row.teamName });
    }
  }

  const actualCentral = [...standingsMap.values()].filter((s) => s.league === "central").sort((a, b) => a.rank - b.rank);
  const actualPacific = [...standingsMap.values()].filter((s) => s.league === "pacific").sort((a, b) => a.rank - b.rank);

  // Build rank lookup: league -> teamName -> actualRank
  const centralRankMap = new Map(actualCentral.map((s) => [s.teamName, s.rank]));
  const pacificRankMap = new Map(actualPacific.map((s) => [s.teamName, s.rank]));

  const hasActual = actualCentral.length > 0 || actualPacific.length > 0;

  // 3. Fetch all commentator predictions for this season
  const allUsers = await db.select().from(users).where(eq(users.role, "commentator"));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const seasonPreds = await db.select().from(predictions).where(and(eq(predictions.seasonId, season.id), eq(predictions.isLocked, true)));
  const commentatorPreds = seasonPreds.filter((p) => userMap.has(p.userId));

  if (commentatorPreds.length === 0) {
    return {
      season: { id: season.id, year: season.year },
      league: leagueParam,
      actualCentral,
      actualPacific,
      totalCommentators: 0,
      commentators: [],
    };
  }

  // 4. Fetch all ranking picks
  const allPicks = await db
    .select()
    .from(rankingPicks)
    .where(inArray(rankingPicks.predictionId, db.select({ id: predictions.id }).from(predictions).where(and(eq(predictions.seasonId, season.id), eq(predictions.isLocked, true)))));
  const predIdSet = new Set(commentatorPreds.map((p) => p.id));
  const relevantPicks = allPicks.filter((rp) => predIdSet.has(rp.predictionId));

  // Group picks by predictionId
  const picksByPred = new Map<number, typeof relevantPicks>();
  for (const rp of relevantPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  // 5. Compute scores for each commentator
  const commentators = commentatorPreds.map((pred) => {
    const user = userMap.get(pred.userId)!;
    const picks = picksByPred.get(pred.id) ?? [];

    const centralPicks = picks.filter((p) => p.league === "central").sort((a, b) => a.rank - b.rank);
    const pacificPicks = picks.filter((p) => p.league === "pacific").sort((a, b) => a.rank - b.rank);

    let centralScore = 0;
    let pacificScore = 0;

    const centralDetails = centralPicks.map((pick) => {
      const actualRank = centralRankMap.get(pick.teamName);
      const score = hasActual && actualRank !== undefined ? calcRankingPointForTeam(pick.rank, actualRank) : 0;
      centralScore += score;
      return {
        rank: pick.rank,
        predictedTeam: pick.teamName,
        actualTeam: actualCentral.find((a) => a.rank === pick.rank)?.teamName ?? "",
        actualRank: actualRank ?? null,
        diff: actualRank !== undefined ? Math.abs(pick.rank - actualRank) : null,
        score,
      };
    });

    const pacificDetails = pacificPicks.map((pick) => {
      const actualRank = pacificRankMap.get(pick.teamName);
      const score = hasActual && actualRank !== undefined ? calcRankingPointForTeam(pick.rank, actualRank) : 0;
      pacificScore += score;
      return {
        rank: pick.rank,
        predictedTeam: pick.teamName,
        actualTeam: actualPacific.find((a) => a.rank === pick.rank)?.teamName ?? "",
        actualRank: actualRank ?? null,
        diff: actualRank !== undefined ? Math.abs(pick.rank - actualRank) : null,
        score,
      };
    });

    const totalScore = centralScore + pacificScore;
    let effectiveTotal = totalScore;
    if (leagueParam === "central") effectiveTotal = centralScore;
    if (leagueParam === "pacific") effectiveTotal = pacificScore;

    return {
      userId: user.id,
      name: user.name,
      slug: user.slug,
      source: user.source,
      sourceUrl: user.sourceUrl,
      variant: user.variant,
      centralScore,
      pacificScore,
      rankingScore: totalScore,
      titleScore: 0,
      totalScore,
      effectiveTotal,
      centralDetails,
      pacificDetails,
    };
  });

  // Deduplicate: keep only the FIRST prediction per user (earliest variant = fairness)
  // variant priority: null/empty (original) > "①" > "②" > ...
  const firstByUser = new Map<number, typeof commentators[0]>();
  for (const c of commentators) {
    const existing = firstByUser.get(c.userId);
    if (!existing) {
      firstByUser.set(c.userId, c);
    } else {
      // Keep the one with null/empty variant (original prediction)
      const cVar = c.variant ?? "";
      const exVar = existing.variant ?? "";
      if (cVar === "" && exVar !== "") {
        firstByUser.set(c.userId, c);
      } else if (cVar < exVar && exVar !== "") {
        // "①" < "②" < "③"
        firstByUser.set(c.userId, c);
      }
    }
  }
  const deduped = Array.from(firstByUser.values());

  // The combined view compares complete セ+パ predictions only. Partial entries
  // remain comparable in their individual league tabs.
  const filtered = leagueParam === "all"
    ? deduped.filter((c) => c.centralDetails.length > 0 && c.pacificDetails.length > 0)
    : deduped.filter((c) =>
        leagueParam === "central"
          ? c.centralDetails.length > 0
          : c.pacificDetails.length > 0,
      );

  // Sort by effectiveTotal descending
  filtered.sort((a, b) => b.effectiveTotal - a.effectiveTotal);

  const ranked = filtered.map((c, idx) => ({ ...c, rank: idx + 1 }));

  return {
    season: { id: season.id, year: season.year },
    league: leagueParam,
    actualCentral,
    actualPacific,
    totalCommentators: ranked.length,
    commentators: ranked,
  };
}
