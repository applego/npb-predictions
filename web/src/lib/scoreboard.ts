import { getDb } from "@/db";
import { users, seasons, scoreSnapshots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Season, ScoreboardResponse } from "@/lib/types";

const toStr = (d: Date | number | null | undefined): string | null =>
  d == null ? null : d instanceof Date ? d.toISOString() : String(d);

export async function getSeasons(): Promise<Season[]> {
  const db = getDb();
  const rows = await db.select().from(seasons).orderBy(desc(seasons.year));
  return rows.map((r) => ({
    id: r.id,
    year: r.year,
    label: r.label,
    isActive: r.isActive,
    lockDate: toStr(r.lockDate),
    createdAt: toStr(r.createdAt) ?? "",
  }));
}

/**
 * Get scoreboard for a given year using score_snapshots.
 * Only shows users who have a snapshot entry (i.e., the 5 friends).
 * Commentators are scored separately via /rankings/commentators.
 */
export async function getScoreboardData(
  year: number
): Promise<ScoreboardResponse | null> {
  const db = getDb();

  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, year));
  if (!season) return null;

  const seasonInfo = {
    id: season.id,
    year: season.year,
    label: season.label,
    isActive: season.isActive,
    lockDate: toStr(season.lockDate),
    createdAt: toStr(season.createdAt) ?? "",
  };

  // Use pre-computed score_snapshots (friends only)
  const snapshots = await db
    .select()
    .from(scoreSnapshots)
    .where(eq(scoreSnapshots.seasonId, season.id))
    .orderBy(desc(scoreSnapshots.totalScore));

  if (snapshots.length === 0) {
    return { season: seasonInfo, scores: [] };
  }

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // Deduplicate by userId — keep the highest-score snapshot
  const seen = new Set<number>();
  const scores: ScoreboardResponse["scores"] = [];
  for (const s of snapshots) {
    if (seen.has(s.userId)) continue;
    seen.add(s.userId);
    const user = userMap.get(s.userId);
    if (!user || user.role !== "friend") continue;
    scores.push({
      userId: user.id,
      userName: user.name,
      rankingScore: s.rankingScore,
      titleScore: s.titleScore,
      totalScore: s.totalScore,
      snapshotDate: toStr(s.snapshotDate) ?? new Date().toISOString(),
    });
  }

  return { season: seasonInfo, scores };
}
