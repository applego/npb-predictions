// Database queries for commentator detail pages
// Computes scores directly from ranking_picks + actual_team_standings
// (no dependency on scoreSnapshots which has no data)
import { getDb } from "@/db";
import {
  users,
  seasons,
  predictions,
  rankingPicks,
  actualTeamStandings,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";

// Available years with prediction data
export const AVAILABLE_YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export interface CommentatorYearScore {
  year: number;
  centralScore: number;
  pacificScore: number;
  totalScore: number;
}

export interface CommentatorDetail {
  userId: number;
  name: string;
  slug: string;
  source: string | null;
  sourceUrl: string | null;
  years: CommentatorYearScore[];
  allTimeTotal: number;
}

export interface TopCommentator {
  name: string;
  slug: string;
  source: string | null;
  sourceUrl: string | null;
  centralScore: number;
  pacificScore: number;
  totalScore: number;
}

/**
 * Compute per-league scores for a single user's prediction in a season.
 * Joins ranking_picks with actual_team_standings to calculate scores
 * using calcRankingPointForTeam.
 */
async function computeScoresForPrediction(
  db: ReturnType<typeof getDb>,
  predictionId: number,
  seasonId: number,
): Promise<{ centralScore: number; pacificScore: number; totalScore: number }> {
  // Fetch actual standings for this season (latest snapshot per league+rank)
  const allStandings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, seasonId))
    .orderBy(desc(actualTeamStandings.snapshotDate));

  // Deduplicate: keep latest snapshot per league:rank
  const standingsMap = new Map<string, { league: string; rank: number; teamName: string }>();
  for (const row of allStandings) {
    const key = `${row.league}:${row.rank}`;
    if (!standingsMap.has(key)) {
      standingsMap.set(key, { league: row.league, rank: row.rank, teamName: row.teamName });
    }
  }

  // Build rank lookup: league -> teamName -> actualRank
  const centralRankMap = new Map<string, number>();
  const pacificRankMap = new Map<string, number>();
  for (const s of standingsMap.values()) {
    if (s.league === "central") centralRankMap.set(s.teamName, s.rank);
    if (s.league === "pacific") pacificRankMap.set(s.teamName, s.rank);
  }

  const hasActual = centralRankMap.size > 0 || pacificRankMap.size > 0;

  // Fetch ranking picks for this prediction
  const picks = await db
    .select()
    .from(rankingPicks)
    .where(eq(rankingPicks.predictionId, predictionId));

  let centralScore = 0;
  let pacificScore = 0;

  for (const pick of picks) {
    const rankMap = pick.league === "central" ? centralRankMap : pacificRankMap;
    const actualRank = rankMap.get(pick.teamName);
    if (hasActual && actualRank !== undefined) {
      const score = calcRankingPointForTeam(pick.rank, actualRank);
      if (pick.league === "central") {
        centralScore += score;
      } else {
        pacificScore += score;
      }
    }
  }

  return {
    centralScore,
    pacificScore,
    totalScore: centralScore + pacificScore,
  };
}

/**
 * Get commentator detail by slug with all-year score history.
 * Scores are computed on-the-fly from ranking_picks + actual_team_standings.
 */
export async function getCommentatorBySlug(
  slug: string
): Promise<CommentatorDetail | null> {
  const db = getDb();

  // 1. Find user by slug
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.slug, slug), eq(users.role, "commentator")));

  if (!user) return null;

  // 2. Find all predictions for this user across all seasons
  const userPreds = await db
    .select({
      predictionId: predictions.id,
      seasonId: predictions.seasonId,
      year: seasons.year,
    })
    .from(predictions)
    .innerJoin(seasons, eq(predictions.seasonId, seasons.id))
    .where(eq(predictions.userId, user.id));

  if (userPreds.length === 0) {
    return {
      userId: user.id,
      name: user.name,
      slug: user.slug,
      source: user.source,
      sourceUrl: user.sourceUrl,
      years: [],
      allTimeTotal: 0,
    };
  }

  // 3. Compute scores for each year
  const years: CommentatorYearScore[] = [];

  for (const pred of userPreds) {
    const scores = await computeScoresForPrediction(db, pred.predictionId, pred.seasonId);
    years.push({
      year: pred.year,
      centralScore: scores.centralScore,
      pacificScore: scores.pacificScore,
      totalScore: scores.totalScore,
    });
  }

  // Sort by year
  years.sort((a, b) => a.year - b.year);

  // 4. Calculate all-time total
  const allTimeTotal = years.reduce((sum, y) => sum + y.totalScore, 0);

  return {
    userId: user.id,
    name: user.name,
    slug: user.slug,
    source: user.source,
    sourceUrl: user.sourceUrl,
    years,
    allTimeTotal,
  };
}

/**
 * Get all commentator slugs for static generation (if needed)
 */
export async function getAllCommentatorSlugs(): Promise<string[]> {
  const db = getDb();

  const commentators = await db
    .select({ slug: users.slug })
    .from(users)
    .where(eq(users.role, "commentator"));

  return commentators.map((c) => c.slug);
}

/**
 * Get top commentators for a specific year, ordered by total score.
 * Scores are computed on-the-fly from ranking_picks + actual_team_standings.
 */
export async function getTopCommentatorsForYear(
  year: number,
  limit: number = 20
): Promise<TopCommentator[]> {
  const db = getDb();

  // 1. Find season by year
  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, year));

  if (!season) return [];

  // 2. Fetch actual standings for this season
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

  const centralRankMap = new Map<string, number>();
  const pacificRankMap = new Map<string, number>();
  for (const s of standingsMap.values()) {
    if (s.league === "central") centralRankMap.set(s.teamName, s.rank);
    if (s.league === "pacific") pacificRankMap.set(s.teamName, s.rank);
  }

  const hasActual = centralRankMap.size > 0 || pacificRankMap.size > 0;

  // 3. Fetch all commentator predictions for this season
  const allCommentators = await db
    .select()
    .from(users)
    .where(eq(users.role, "commentator"));
  const userMap = new Map(allCommentators.map((u) => [u.id, u]));

  const seasonPreds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.seasonId, season.id));
  const commentatorPreds = seasonPreds.filter((p) => userMap.has(p.userId));

  if (commentatorPreds.length === 0) return [];

  // 4. Fetch all ranking picks for these predictions
  const allPicks = await db.select().from(rankingPicks);
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
  const results: TopCommentator[] = commentatorPreds.map((pred) => {
    const user = userMap.get(pred.userId)!;
    const picks = picksByPred.get(pred.id) ?? [];

    let centralScore = 0;
    let pacificScore = 0;

    for (const pick of picks) {
      const rankMap = pick.league === "central" ? centralRankMap : pacificRankMap;
      const actualRank = rankMap.get(pick.teamName);
      if (hasActual && actualRank !== undefined) {
        const score = calcRankingPointForTeam(pick.rank, actualRank);
        if (pick.league === "central") {
          centralScore += score;
        } else {
          pacificScore += score;
        }
      }
    }

    return {
      name: user.name,
      slug: user.slug,
      source: user.source,
      sourceUrl: user.sourceUrl,
      centralScore,
      pacificScore,
      totalScore: centralScore + pacificScore,
    };
  });

  // Sort by total score descending and limit
  results.sort((a, b) => b.totalScore - a.totalScore);
  return results.slice(0, limit);
}
