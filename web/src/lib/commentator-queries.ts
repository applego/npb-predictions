// Database queries for commentator detail pages
import { getDb } from "@/db";
import {
  users,
  seasons,
  scoreSnapshots,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Available years with prediction data
export const AVAILABLE_YEARS = [2023, 2024, 2025, 2026] as const;

// Source badge type and colors
export type SourceBadge = "YouTube" | "新聞" | "テレビ" | "ラジオ" | "雑誌";

export const SOURCE_BADGE_COLORS: Record<
  SourceBadge,
  { bg: string; border: string; text: string }
> = {
  YouTube: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    text: "#fca5a5",
  },
  新聞: {
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.25)",
    text: "#94a3b8",
  },
  テレビ: {
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
    text: "#7dd3fc",
  },
  ラジオ: {
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    text: "#c4b5fd",
  },
  雑誌: {
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.25)",
    text: "#6ee7b7",
  },
};

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
  years: CommentatorYearScore[];
  allTimeTotal: number;
}

export interface TopCommentator {
  name: string;
  slug: string;
  source: string | null;
  centralScore: number;
  pacificScore: number;
  totalScore: number;
}

/**
 * Get commentator detail by slug with all-year score history
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

  // 2. Fetch all score snapshots for this user across all seasons
  const scoresWithSeasons = await db
    .select({
      year: seasons.year,
      rankingScore: scoreSnapshots.rankingScore,
      titleScore: scoreSnapshots.titleScore,
      totalScore: scoreSnapshots.totalScore,
      snapshotDate: scoreSnapshots.snapshotDate,
    })
    .from(scoreSnapshots)
    .innerJoin(seasons, eq(scoreSnapshots.seasonId, seasons.id))
    .where(eq(scoreSnapshots.userId, user.id))
    .orderBy(desc(scoreSnapshots.snapshotDate));

  // 3. Deduplicate: keep only latest snapshot per year
  const seenYears = new Set<number>();
  const latestPerYear = scoresWithSeasons.filter((row) => {
    if (seenYears.has(row.year)) return false;
    seenYears.add(row.year);
    return true;
  });

  // 4. Build year-by-year scores
  // Note: we only have totalScore, rankingScore, titleScore from DB
  // For per-league breakdown (centralScore, pacificScore), we'd need to re-calculate
  // For now, we'll use rankingScore as central and titleScore as pacific (placeholder)
  // TODO: Implement proper per-league score calculation
  const years: CommentatorYearScore[] = latestPerYear.map((row) => ({
    year: row.year,
    centralScore: Math.round(row.rankingScore / 2), // Placeholder: split equally
    pacificScore: Math.round(row.rankingScore / 2), // Placeholder: split equally
    totalScore: row.totalScore,
  }));

  // 5. Calculate all-time total
  const allTimeTotal = years.reduce((sum, y) => sum + y.totalScore, 0);

  return {
    userId: user.id,
    name: user.name,
    slug: user.slug,
    source: user.source,
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
 * Get top commentators for a specific year, ordered by total score
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

  // 2. Get latest score snapshots for all commentators in this season
  const scoresWithUsers = await db
    .select({
      userId: users.id,
      name: users.name,
      slug: users.slug,
      source: users.source,
      rankingScore: scoreSnapshots.rankingScore,
      titleScore: scoreSnapshots.titleScore,
      totalScore: scoreSnapshots.totalScore,
      snapshotDate: scoreSnapshots.snapshotDate,
    })
    .from(scoreSnapshots)
    .innerJoin(users, eq(scoreSnapshots.userId, users.id))
    .innerJoin(seasons, eq(scoreSnapshots.seasonId, seasons.id))
    .where(
      and(
        eq(scoreSnapshots.seasonId, season.id),
        eq(users.role, "commentator")
      )
    )
    .orderBy(desc(scoreSnapshots.snapshotDate), desc(scoreSnapshots.totalScore));

  // 3. Deduplicate: keep only latest snapshot per user
  const seenUsers = new Set<number>();
  const latestPerUser = scoresWithUsers.filter((row) => {
    if (seenUsers.has(row.userId)) return false;
    seenUsers.add(row.userId);
    return true;
  });

  // 4. Sort by total score descending and limit
  const topScorers = latestPerUser
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);

  // 5. Build result with central/pacific split
  // TODO: Calculate actual per-league scores from rankingPicks + actualTeamStandings
  // For now, use placeholder: split rankingScore equally
  return topScorers.map((row) => ({
    name: row.name,
    slug: row.slug,
    source: row.source,
    centralScore: Math.round(row.rankingScore / 2),
    pacificScore: Math.round(row.rankingScore / 2),
    totalScore: row.totalScore,
  }));
}
