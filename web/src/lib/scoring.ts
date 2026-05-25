/**
 * NPB Predictions League - Score calculation engine
 *
 * Ranking score: based on diff between predicted and actual rank
 * Title score: +3 per correct title pick
 * Monthly champion: user with highest total score gain in a given month
 */

import { getTeamByName } from "./teams";

// Normalize a team identifier (full name, short name, or abbr) to its
// canonical full name. Falls back to the input string if the team isn't
// recognized so unknown names still bucket consistently.
function normalizeTeamName(name: string): string {
  return getTeamByName(name)?.name ?? name;
}

// --- Constants ---

const RANKING_SCORE_TABLE: Record<number, number> = {
  0: 5,
  1: 3,
  2: 1,
  3: -1,
  4: -3,
  5: -5,
};

const TITLE_HIT_SCORE = 3;

// --- Types ---

export interface RankingPick {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
}

export interface TitlePick {
  league: "central" | "pacific";
  category: string;
  playerName: string;
}

export interface ActualStanding {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
}

export interface ActualTitle {
  league: "central" | "pacific";
  category: string;
  playerName: string;
}

export interface UserScoreBreakdown {
  userId: number;
  rankingScore: number;
  titleScore: number;
  totalScore: number;
  rankingDetails: RankingScoreDetail[];
  titleDetails: TitleScoreDetail[];
}

export interface RankingScoreDetail {
  league: "central" | "pacific";
  teamName: string;
  predictedRank: number;
  actualRank: number;
  diff: number;
  score: number;
}

export interface TitleScoreDetail {
  league: "central" | "pacific";
  category: string;
  predictedPlayer: string;
  actualPlayer: string;
  hit: boolean;
  score: number;
}

export interface MonthlyChampionResult {
  month: number;
  userId: number;
  scoreGain: number;
}

// --- Core functions ---

/**
 * Calculate ranking score for a single team pick.
 * diff = |predicted - actual|, capped at 5
 */
export function calcRankingPointForTeam(
  predictedRank: number,
  actualRank: number
): number {
  const diff = Math.min(Math.abs(predictedRank - actualRank), 5);
  return RANKING_SCORE_TABLE[diff] ?? -5;
}

/**
 * Build a lookup from teamName -> actual rank for a given league.
 */
function buildActualRankMap(
  actuals: ActualStanding[],
  league: "central" | "pacific"
): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of actuals) {
    if (a.league === league) {
      map.set(normalizeTeamName(a.teamName), a.rank);
    }
  }
  return map;
}

/**
 * Calculate total ranking score for one user's picks against actual standings.
 */
export function calcRankingScore(
  picks: RankingPick[],
  actuals: ActualStanding[]
): { score: number; details: RankingScoreDetail[] } {
  const centralMap = buildActualRankMap(actuals, "central");
  const pacificMap = buildActualRankMap(actuals, "pacific");
  const details: RankingScoreDetail[] = [];
  let score = 0;

  for (const pick of picks) {
    const rankMap =
      pick.league === "central" ? centralMap : pacificMap;
    const actualRank = rankMap.get(normalizeTeamName(pick.teamName));
    if (actualRank === undefined) continue; // team not in actuals yet

    const diff = Math.abs(pick.rank - actualRank);
    const pts = calcRankingPointForTeam(pick.rank, actualRank);
    score += pts;
    details.push({
      league: pick.league,
      teamName: pick.teamName,
      predictedRank: pick.rank,
      actualRank,
      diff,
      score: pts,
    });
  }

  return { score, details };
}

/**
 * Calculate title score: +3 for each correct player pick.
 * Comparison is case-insensitive, trimmed.
 */
export function calcTitleScore(
  picks: TitlePick[],
  actuals: ActualTitle[]
): { score: number; details: TitleScoreDetail[] } {
  // Build lookup: "league:category" -> actualPlayerName
  const actualMap = new Map<string, string>();
  for (const a of actuals) {
    actualMap.set(`${a.league}:${a.category}`, a.playerName);
  }

  const details: TitleScoreDetail[] = [];
  let score = 0;

  for (const pick of picks) {
    const key = `${pick.league}:${pick.category}`;
    const actualPlayer = actualMap.get(key);
    if (actualPlayer === undefined) continue;

    const hit =
      normalizePlayerName(pick.playerName) ===
      normalizePlayerName(actualPlayer);
    const pts = hit ? TITLE_HIT_SCORE : 0;
    score += pts;
    details.push({
      league: pick.league,
      category: pick.category,
      predictedPlayer: pick.playerName,
      actualPlayer,
      hit,
      score: pts,
    });
  }

  return { score, details };
}

function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Calculate full score breakdown for a single user.
 */
export function calcUserScore(
  userId: number,
  rankingPicks: RankingPick[],
  titlePicks: TitlePick[],
  actualStandings: ActualStanding[],
  actualTitles: ActualTitle[]
): UserScoreBreakdown {
  const ranking = calcRankingScore(rankingPicks, actualStandings);
  const title = calcTitleScore(titlePicks, actualTitles);
  return {
    userId,
    rankingScore: ranking.score,
    titleScore: title.score,
    totalScore: ranking.score + title.score,
    rankingDetails: ranking.details,
    titleDetails: title.details,
  };
}

/**
 * Determine monthly champion from score snapshots.
 * For each month, find the user with the highest score gain
 * (current month's latest snapshot - previous month's latest snapshot).
 *
 * Returns one winner per month. Ties go to the first user found (stable).
 */
export function calcMonthlyChampions(
  snapshots: {
    userId: number;
    totalScore: number;
    snapshotDate: Date;
  }[]
): MonthlyChampionResult[] {
  if (snapshots.length === 0) return [];

  // Group snapshots by userId, then by month
  const byUser = new Map<number, Map<number, number>>();

  for (const s of snapshots) {
    const month = s.snapshotDate.getMonth() + 1; // 1-12
    if (!byUser.has(s.userId)) byUser.set(s.userId, new Map());
    const monthMap = byUser.get(s.userId)!;
    // Keep the latest (highest) score per month
    const existing = monthMap.get(month);
    if (existing === undefined || s.totalScore > existing) {
      monthMap.set(month, s.totalScore);
    }
  }

  // Collect all months that appear
  const allMonths = new Set<number>();
  for (const monthMap of byUser.values()) {
    for (const m of monthMap.keys()) allMonths.add(m);
  }

  const results: MonthlyChampionResult[] = [];

  for (const month of [...allMonths].sort((a, b) => a - b)) {
    let bestUserId = -1;
    let bestGain = -Infinity;

    for (const [userId, monthMap] of byUser) {
      const currentScore = monthMap.get(month) ?? 0;
      const prevScore = monthMap.get(month - 1) ?? 0;
      const gain = currentScore - prevScore;

      if (gain > bestGain) {
        bestGain = gain;
        bestUserId = userId;
      }
    }

    if (bestUserId >= 0) {
      results.push({ month, userId: bestUserId, scoreGain: bestGain });
    }
  }

  return results;
}
