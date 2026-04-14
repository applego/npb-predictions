// Database queries for commentator detail pages
import { getDb } from "@/db";
import {
  users,
  seasons,
  scoreSnapshots,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
