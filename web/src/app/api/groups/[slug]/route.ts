export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  battleGroups,
  battleGroupMembers,
  users,
  seasons,
  predictions,
  rankingPicks,
  actualTeamStandings,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";
import { requireAuth } from "@/lib/auth-server";

/**
 * GET /api/groups/[slug]?year=2025
 *
 * Returns group details + member scores computed on the fly.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");

  const db = getDb();

  // 1. Find the group
  const [group] = await db
    .select()
    .from(battleGroups)
    .where(eq(battleGroups.slug, slug))
    .limit(1);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const [requesterMembership] = await db
    .select()
    .from(battleGroupMembers)
    .where(
      and(
        eq(battleGroupMembers.groupId, group.id),
        eq(battleGroupMembers.userId, auth.user.id),
      ),
    )
    .limit(1);

  if (!requesterMembership) {
    return NextResponse.json(
      { error: "Group membership required" },
      { status: 403 },
    );
  }

  // 2. Fetch members
  const memberships = await db
    .select()
    .from(battleGroupMembers)
    .where(eq(battleGroupMembers.groupId, group.id));

  const memberUserIds = memberships.map((m) => m.userId);

  // Fetch member user data
  const allUsers = await db.select().from(users);
  const memberUsers = allUsers.filter((u) => memberUserIds.includes(u.id));
  const userMap = new Map(memberUsers.map((u) => [u.id, u]));

  // 3. Determine the season year
  const allSeasons = await db
    .select()
    .from(seasons)
    .orderBy(desc(seasons.year));

  let year: number;
  if (yearParam) {
    year = parseInt(yearParam, 10);
  } else {
    const active = allSeasons.find((s) => s.isActive) ?? allSeasons[0];
    year = active?.year ?? new Date().getFullYear();
  }

  const season = allSeasons.find((s) => s.year === year);
  if (!season) {
    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        slug: group.slug,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt,
      },
      members: memberUsers.map((u) => ({
        userId: u.id,
        name: u.name,
        slug: u.slug,
        avatarUrl: u.avatarUrl,
      })),
      season: null,
      scoreboard: [],
      availableYears: allSeasons.map((s) => s.year),
    });
  }

  // 4. Fetch actual standings
  const allStandings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, season.id))
    .orderBy(desc(actualTeamStandings.snapshotDate));

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

  const centralRankMap = new Map<string, number>();
  const pacificRankMap = new Map<string, number>();
  for (const s of standingsMap.values()) {
    if (s.league === "central") centralRankMap.set(s.teamName, s.rank);
    else pacificRankMap.set(s.teamName, s.rank);
  }

  const hasActual = centralRankMap.size > 0 || pacificRankMap.size > 0;

  // 5. Fetch predictions for members in this season
  const allPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.seasonId, season.id));

  const memberPredictions = allPredictions.filter((p) =>
    memberUserIds.includes(p.userId),
  );

  // 6. Fetch ranking picks for those predictions
  const predIdSet = new Set(memberPredictions.map((p) => p.id));
  const allPicks = await db.select().from(rankingPicks);
  const relevantPicks = allPicks.filter((rp) => predIdSet.has(rp.predictionId));

  const picksByPred = new Map<number, (typeof relevantPicks)>();
  for (const rp of relevantPicks) {
    const arr = picksByPred.get(rp.predictionId) ?? [];
    arr.push(rp);
    picksByPred.set(rp.predictionId, arr);
  }

  // 7. Compute scores for each member
  const scoreboard = memberUserIds.map((userId) => {
    const user = userMap.get(userId);
    const pred = memberPredictions.find((p) => p.userId === userId);

    if (!user || !pred) {
      return {
        userId,
        name: user?.name ?? "Unknown",
        slug: user?.slug ?? "",
        avatarUrl: user?.avatarUrl ?? null,
        centralScore: 0,
        pacificScore: 0,
        totalScore: 0,
        hasPrediction: false,
        centralPicks: [] as Array<{ rank: number; teamName: string; actualRank: number | null; score: number }>,
        pacificPicks: [] as Array<{ rank: number; teamName: string; actualRank: number | null; score: number }>,
      };
    }

    const picks = picksByPred.get(pred.id) ?? [];
    const cPicks = picks
      .filter((p) => p.league === "central")
      .sort((a, b) => a.rank - b.rank);
    const pPicks = picks
      .filter((p) => p.league === "pacific")
      .sort((a, b) => a.rank - b.rank);

    let centralScore = 0;
    let pacificScore = 0;

    const centralPickDetails = cPicks.map((pick) => {
      const actualRank = centralRankMap.get(pick.teamName);
      const score =
        hasActual && actualRank !== undefined
          ? calcRankingPointForTeam(pick.rank, actualRank)
          : 0;
      centralScore += score;
      return {
        rank: pick.rank,
        teamName: pick.teamName,
        actualRank: actualRank ?? null,
        score,
      };
    });

    const pacificPickDetails = pPicks.map((pick) => {
      const actualRank = pacificRankMap.get(pick.teamName);
      const score =
        hasActual && actualRank !== undefined
          ? calcRankingPointForTeam(pick.rank, actualRank)
          : 0;
      pacificScore += score;
      return {
        rank: pick.rank,
        teamName: pick.teamName,
        actualRank: actualRank ?? null,
        score,
      };
    });

    return {
      userId,
      name: user.name,
      slug: user.slug,
      avatarUrl: user.avatarUrl,
      centralScore,
      pacificScore,
      totalScore: centralScore + pacificScore,
      hasPrediction: true,
      centralPicks: centralPickDetails,
      pacificPicks: pacificPickDetails,
    };
  });

  // Sort by totalScore descending
  scoreboard.sort((a, b) => b.totalScore - a.totalScore);

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      slug: group.slug,
      inviteCode: group.inviteCode,
      createdAt: group.createdAt,
    },
    members: scoreboard.map((s) => ({
      userId: s.userId,
      name: s.name,
      slug: s.slug,
      avatarUrl: s.avatarUrl,
    })),
    season: { id: season.id, year: season.year },
    scoreboard,
    availableYears: allSeasons.map((s) => s.year),
  });
}
