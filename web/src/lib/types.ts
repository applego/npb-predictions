// Shared types mirroring the DB schema for frontend use

export type League = "central" | "pacific";

export type TitleCategory =
  | "batting_avg"
  | "rbi"
  | "home_runs"
  | "wins"
  | "era"
  | "saves";

export interface Season {
  id: number;
  year: number;
  label: string;
  isActive: boolean;
  lockDate: string | null;
  createdAt: string;
}

export interface User {
  id: number;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role?: string;
  firebaseUid?: string | null;
  email?: string | null;
}

export interface RankingPick {
  id: number;
  predictionId: number;
  league: League;
  rank: number;
  teamName: string;
}

export interface TitlePick {
  id: number;
  predictionId: number;
  league: League;
  category: TitleCategory;
  playerName: string;
  teamName: string | null;
}

export interface Prediction {
  id: number;
  userId: number;
  seasonId: number;
  isLocked: boolean;
  lockedAt: string | null;
  user: User;
  rankingPicks: RankingPick[];
  titlePicks: TitlePick[];
}

export interface ScoreEntry {
  userId: number;
  userName: string;
  rankingScore: number;
  titleScore: number;
  totalScore: number;
  snapshotDate: string;
}

export interface ScoreboardResponse {
  season: Season;
  scores: ScoreEntry[];
}

export const TITLE_CATEGORY_LABELS: Record<TitleCategory, string> = {
  batting_avg: "首位打者",
  rbi: "打点王",
  home_runs: "本塁打王",
  wins: "最多勝",
  era: "最優秀防御率",
  saves: "最多セーブ",
};

export const LEAGUE_LABELS: Record<League, string> = {
  central: "セ・リーグ",
  pacific: "パ・リーグ",
};
