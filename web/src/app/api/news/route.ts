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

// ── Types ──

interface NewsItem {
  id: string;
  type: "hit" | "ranking" | "prediction" | "spotlight";
  title: string;
  body: string;
  commentator?: string;
  year?: number;
  timestamp: number;
  icon: string;
}

// ── Helpers ──

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

const LEAGUE_LABELS: Record<string, string> = {
  central: "セ・リーグ",
  pacific: "パ・リーグ",
};

/**
 * GET /api/news?limit=20
 *
 * Generates a news feed from D1 data:
 * - hit: exact ranking predictions (diff=0)
 * - ranking: top scorers per season
 * - prediction: recent predictions with source info
 * - spotlight: users with multiple prediction variants
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);

  const db = getDb();
  const newsItems: NewsItem[] = [];

  // Fetch all seasons
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.year));

  // Fetch all users
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  for (const season of allSeasons) {
    // ── 1. 的中速報 (hit) ──
    // Find ranking picks that match actual standings exactly

    const seasonStandings = await db
      .select()
      .from(actualTeamStandings)
      .where(eq(actualTeamStandings.seasonId, season.id))
      .orderBy(desc(actualTeamStandings.snapshotDate));

    // Deduplicate standings: latest snapshot per league+rank
    const standingsMap = new Map<string, { league: string; rank: number; teamName: string }>();
    for (const row of seasonStandings) {
      const key = `${row.league}:${row.rank}`;
      if (!standingsMap.has(key)) {
        standingsMap.set(key, { league: row.league, rank: row.rank, teamName: row.teamName });
      }
    }

    // Build actual rank lookup: league -> teamName -> actualRank
    const actualRankByLeague = new Map<string, Map<string, number>>();
    for (const s of standingsMap.values()) {
      if (!actualRankByLeague.has(s.league)) actualRankByLeague.set(s.league, new Map());
      actualRankByLeague.get(s.league)!.set(s.teamName, s.rank);
    }

    // Only generate hit news if we have actual standings
    if (standingsMap.size > 0) {
      const seasonPredictions = await db
        .select()
        .from(predictions)
        .where(eq(predictions.seasonId, season.id));

      const predIds = seasonPredictions.map((p) => p.id);

      if (predIds.length > 0) {
        const allPicks = await db.select().from(rankingPicks);
        const relevantPicks = allPicks.filter((rp) => predIds.includes(rp.predictionId));

        // Map predictionId -> userId
        const predUserMap = new Map(seasonPredictions.map((p) => [p.id, p.userId]));

        for (const pick of relevantPicks) {
          const leagueRanks = actualRankByLeague.get(pick.league);
          if (!leagueRanks) continue;

          const actualRank = leagueRanks.get(pick.teamName);
          if (actualRank === undefined) continue;

          if (pick.rank === actualRank) {
            const userId = predUserMap.get(pick.predictionId);
            const user = userId ? userMap.get(userId) : undefined;
            if (!user) continue;

            const score = calcRankingPointForTeam(pick.rank, actualRank);
            const leagueLabel = LEAGUE_LABELS[pick.league] ?? pick.league;

            newsItems.push({
              id: `hit-${season.year}-${user.id}-${pick.league}-${pick.rank}`,
              type: "hit",
              title: `${user.name}が${season.year}年${leagueLabel}${pick.rank}位(${pick.teamName})を的中！`,
              body: `順位予想が完全一致。${fmtScore(score)}点獲得。`,
              commentator: user.name,
              year: season.year,
              timestamp: season.year * 10000000 + pick.rank,
              icon: "🎯",
            });
          }
        }
      }
    }

    // ── 2. ランキング変動 (ranking) ──
    // Top 3 scorers per season from score_snapshots

    const seasonScores = await db
      .select({
        userId: scoreSnapshots.userId,
        totalScore: scoreSnapshots.totalScore,
        snapshotDate: scoreSnapshots.snapshotDate,
      })
      .from(scoreSnapshots)
      .where(eq(scoreSnapshots.seasonId, season.id))
      .orderBy(desc(scoreSnapshots.totalScore));

    // Deduplicate: latest score per user
    const seenScoreUsers = new Set<number>();
    const topScores = seasonScores.filter((row) => {
      if (seenScoreUsers.has(row.userId)) return false;
      seenScoreUsers.add(row.userId);
      return true;
    });

    // Top 3 scorers
    topScores.slice(0, 3).forEach((row, idx) => {
      const user = userMap.get(row.userId);
      if (!user) return;

      const rank = idx + 1;
      const rankLabel = rank === 1 ? "1位" : rank === 2 ? "2位" : "3位";

      newsItems.push({
        id: `ranking-${season.year}-${user.id}`,
        type: "ranking",
        title: `${season.year}年ランキング: ${user.name}が${rankLabel}`,
        body: `トータルスコア ${fmtScore(row.totalScore)}点。`,
        commentator: user.name,
        year: season.year,
        timestamp: season.year * 10000000 + 5000 + rank,
        icon: rank === 1 ? "🏆" : rank === 2 ? "🥈" : "🥉",
      });
    });

    // ── 3. 新規予想 (prediction) ──
    // Recent predictions with source info

    const seasonPreds = await db
      .select({
        userId: predictions.userId,
        createdAt: predictions.createdAt,
      })
      .from(predictions)
      .where(eq(predictions.seasonId, season.id))
      .orderBy(desc(predictions.createdAt));

    for (const pred of seasonPreds) {
      const user = userMap.get(pred.userId);
      if (!user) continue;

      const displayName = user.variant ? `${user.name}(${user.variant})` : user.name;
      const sourceInfo = user.source ? ` (${user.source})` : "";

      newsItems.push({
        id: `prediction-${season.year}-${user.id}`,
        type: "prediction",
        title: `${displayName}が${season.year}年の予想を登録`,
        body: `データソース: ${user.source ?? "直接入力"}${sourceInfo ? "" : ""}`,
        commentator: user.name,
        year: season.year,
        timestamp: season.year * 10000000 + 3000 + pred.userId,
        icon: "📝",
      });
    }
  }

  // ── 4. 解説者注目 (spotlight) ──
  // Users with multiple predictions (variants) in the same year

  // Group users by base name (without variant) per year
  const usersByBaseName = new Map<string, { userId: number; name: string; variant: string | null; source: string | null; year: number }[]>();

  for (const season of allSeasons) {
    const seasonPreds = await db
      .select({ userId: predictions.userId })
      .from(predictions)
      .where(eq(predictions.seasonId, season.id));

    const predUserIds = new Set(seasonPreds.map((p) => p.userId));

    for (const userId of predUserIds) {
      const user = userMap.get(userId);
      if (!user) continue;

      // Extract base name (without trailing numbers/symbols that indicate variants)
      const baseName = user.name.replace(/[①②③④⑤⑥⑦⑧⑨⑩\d]+$/, "").trim();
      const key = `${baseName}-${season.year}`;

      if (!usersByBaseName.has(key)) usersByBaseName.set(key, []);
      usersByBaseName.get(key)!.push({
        userId: user.id,
        name: user.name,
        variant: user.variant,
        source: user.source,
        year: season.year,
      });
    }
  }

  for (const [key, variants] of usersByBaseName) {
    if (variants.length < 2) continue;

    const baseName = key.split("-").slice(0, -1).join("-");
    const year = variants[0].year;

    // Find best score among variants
    let bestScore = -Infinity;
    for (const v of variants) {
      const scores = await db
        .select({ totalScore: scoreSnapshots.totalScore })
        .from(scoreSnapshots)
        .innerJoin(seasons, eq(scoreSnapshots.seasonId, seasons.id))
        .where(and(eq(scoreSnapshots.userId, v.userId), eq(seasons.year, year)))
        .orderBy(desc(scoreSnapshots.totalScore))
        .limit(1);

      if (scores.length > 0 && scores[0].totalScore > bestScore) {
        bestScore = scores[0].totalScore;
      }
    }

    const scoreText = bestScore > -Infinity ? `最高${fmtScore(bestScore)}点` : "";

    newsItems.push({
      id: `spotlight-${year}-${baseName}`,
      type: "spotlight",
      title: `${baseName}、${year}年は${variants.length}パターン予想`,
      body: scoreText ? `複数の予想パターンを提出して${scoreText}。` : `${variants.length}通りの順位予想を提出。`,
      commentator: baseName,
      year,
      timestamp: year * 10000000 + 1000,
      icon: "🔍",
    });
  }

  // Sort by timestamp descending (newer first)
  newsItems.sort((a, b) => b.timestamp - a.timestamp);

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = newsItems.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return NextResponse.json(unique.slice(0, limit));
}
