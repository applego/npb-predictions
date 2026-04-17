export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, seasons, predictions, rankingPicks, actualTeamStandings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";
import type { League } from "@/db/schema";

interface StandingEntry {
  league: League;
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
}

interface RankChange {
  league: League;
  teamName: string;
  previousRank: number;
  currentRank: number;
  change: number;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year: yearStr } = await params;
  const yearNum = parseInt(yearStr, 10);

  const db = getDb();
  const [season] = await db.select().from(seasons).where(eq(seasons.year, yearNum));
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  // Actual standings (ordered by snapshotDate desc)
  const allStandings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, season.id))
    .orderBy(desc(actualTeamStandings.snapshotDate));

  // Build rankMap (latest rank per team) and also collect latest full standings
  const rankMap = new Map<string, Map<string, number>>(); // league -> teamName -> rank
  const latestStandingsMap = new Map<string, StandingEntry>(); // "league:teamName" -> entry
  const snapshotDates = new Set<number>();

  for (const row of allStandings) {
    const dateKey = row.snapshotDate instanceof Date
      ? row.snapshotDate.getTime()
      : Number(row.snapshotDate) * 1000;
    snapshotDates.add(dateKey);

    if (!rankMap.has(row.league)) rankMap.set(row.league, new Map());
    const m = rankMap.get(row.league)!;
    if (!m.has(row.teamName)) {
      m.set(row.teamName, row.rank);
    }

    const key = `${row.league}:${row.teamName}`;
    if (!latestStandingsMap.has(key)) {
      latestStandingsMap.set(key, {
        league: row.league,
        rank: row.rank,
        teamName: row.teamName,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
      });
    }
  }

  // Build latest standings array
  const latestStandings: StandingEntry[] = [...latestStandingsMap.values()];
  latestStandings.sort((a, b) => {
    if (a.league !== b.league) return a.league < b.league ? -1 : 1;
    return a.rank - b.rank;
  });

  // Compute rank changes: find two most recent distinct snapshot dates
  const sortedDates = [...snapshotDates].sort((a, b) => b - a);
  const changes: RankChange[] = [];

  if (sortedDates.length >= 2) {
    const latestDate = sortedDates[0];
    const previousDate = sortedDates[1];

    // Build rank maps for each date
    const currentRanks = new Map<string, number>(); // "league:teamName" -> rank
    const previousRanks = new Map<string, number>();

    for (const row of allStandings) {
      const dateKey = row.snapshotDate instanceof Date
        ? row.snapshotDate.getTime()
        : Number(row.snapshotDate) * 1000;
      const key = `${row.league}:${row.teamName}`;

      if (dateKey === latestDate && !currentRanks.has(key)) {
        currentRanks.set(key, row.rank);
      }
      if (dateKey === previousDate && !previousRanks.has(key)) {
        previousRanks.set(key, row.rank);
      }
    }

    // Compare ranks
    for (const [key, currentRank] of currentRanks) {
      const previousRank = previousRanks.get(key);
      if (previousRank !== undefined && previousRank !== currentRank) {
        const [league, teamName] = [key.split(":")[0] as League, key.slice(key.indexOf(":") + 1)];
        changes.push({
          league,
          teamName,
          previousRank,
          currentRank,
          change: previousRank - currentRank, // positive = moved up
        });
      }
    }
  }

  if (rankMap.size === 0) {
    return NextResponse.json({ season, scores: [], standings: [], changes: [] });
  }

  // All predictions for this season (friends only, not commentators)
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const preds = await db.select().from(predictions).where(eq(predictions.seasonId, season.id));
  // Show all users' scores (friends + commentators)
  const targetPreds = preds;

  const allPicks = await db.select().from(rankingPicks);
  const picksByPred = new Map<number, typeof allPicks>();
  for (const rp of allPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  // Compute scores
  const scores = targetPreds.map((pred) => {
    const user = userMap.get(pred.userId);
    if (!user) return null;

    const picks = picksByPred.get(pred.id) ?? [];
    let rankingScore = 0;

    for (const pick of picks) {
      const leagueMap = rankMap.get(pick.league);
      if (!leagueMap) continue;
      const actualRank = leagueMap.get(pick.teamName);
      if (actualRank === undefined) continue;
      rankingScore += calcRankingPointForTeam(pick.rank, actualRank);
    }

    return {
      userId: user.id,
      userName: user.name,
      rankingScore,
      titleScore: 0,
      totalScore: rankingScore,
      snapshotDate: new Date().toISOString(),
    };
  }).filter(Boolean);

  scores.sort((a, b) => b!.totalScore - a!.totalScore);

  return NextResponse.json({ season, scores, standings: latestStandings, changes });
}
