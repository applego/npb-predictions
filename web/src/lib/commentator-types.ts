/**
 * Types for commentator rankings API response and UI components.
 */

export type SourceBadge = "YouTube" | "テレビ" | "新聞" | "雑誌" | "ラジオ" | "Web" | "その他";

export type LeagueFilter = "all" | "central" | "pacific";
export type SortKey = "score" | "name";

export interface RankingDetail {
  rank: number;
  predictedTeam: string;
  actualTeam: string;
  actualRank: number | null;
  diff: number | null;
  score: number;
}

export interface CommentatorData {
  userId: number;
  name: string;
  slug: string;
  source: string | null;
  variant: string | null;
  centralScore: number;
  pacificScore: number;
  rankingScore: number;
  titleScore: number;
  totalScore: number;
  effectiveTotal: number;
  centralDetails: RankingDetail[];
  pacificDetails: RankingDetail[];
  rank: number;
}

export interface CommentatorRankingsResponse {
  season: { id: number; year: number };
  league: string;
  actualCentral: Array<{ league: string; rank: number; teamName: string }>;
  actualPacific: Array<{ league: string; rank: number; teamName: string }>;
  totalCommentators: number;
  commentators: CommentatorData[];
}

// Source badge color mapping
export const SOURCE_BADGE_CONFIG: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  YouTube: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    text: "#fca5a5",
    label: "YouTube",
  },
  "テレビ": {
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
    text: "#7dd3fc",
    label: "テレビ",
  },
  "新聞": {
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.25)",
    text: "#94a3b8",
    label: "新聞",
  },
  "雑誌": {
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.25)",
    text: "#6ee7b7",
    label: "雑誌",
  },
  "ラジオ": {
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    text: "#c4b5fd",
    label: "ラジオ",
  },
  Web: {
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.25)",
    text: "#fcd34d",
    label: "Web",
  },
};

// Fallback for unknown sources
export const DEFAULT_SOURCE_BADGE = {
  bg: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.15)",
  text: "rgba(255,255,255,0.5)",
  label: "その他",
};

export function getSourceBadgeColors(source: string | null) {
  if (!source) return DEFAULT_SOURCE_BADGE;
  return SOURCE_BADGE_CONFIG[source] ?? DEFAULT_SOURCE_BADGE;
}

/**
 * Score-based color: green for positive (correct), amber for +1/+3, red for negative
 */
export function getScoreColor(score: number): string {
  if (score === 5) return "#4ade80"; // green-400 (perfect)
  if (score === 3) return "#86efac"; // green-300
  if (score === 1) return "#fbbf24"; // amber-400
  if (score === -1) return "#fb923c"; // orange-400
  if (score <= -3) return "#f87171"; // red-400
  return "rgba(255,255,255,0.5)";
}

/**
 * Get diff label for prediction vs actual comparison
 */
export function getDiffLabel(diff: number | null, score: number): { text: string; color: string } {
  if (diff === null) return { text: "---", color: "rgba(255,255,255,0.3)" };
  if (diff === 0) return { text: "的中 +5", color: "#4ade80" };
  if (diff === 1) return { text: `${diff}差 +3`, color: "#86efac" };
  if (diff === 2) return { text: `${diff}差 +1`, color: "#fbbf24" };
  if (diff === 3) return { text: `${diff}差 -1`, color: "#fb923c" };
  if (diff === 4) return { text: `${diff}差 -3`, color: "#f87171" };
  return { text: `${diff}差 -5`, color: "#ef4444" };
}
