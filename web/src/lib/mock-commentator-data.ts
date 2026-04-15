// Mock commentator ranking data — will be replaced by DB queries once seeded
// Source badges indicate where the commentator primarily appears

export type SourceBadge = "YouTube" | "新聞" | "テレビ" | "ラジオ" | "雑誌" | "Web";

export interface CommentatorScore {
  name: string;
  slug: string;
  source: SourceBadge;
  centralScore: number;
  pacificScore: number;
  totalScore: number;
}

export interface CommentatorYearData {
  year: number;
  commentators: CommentatorScore[];
}

function makeSlug(name: string): string {
  // Simple slug from name — in production, use a proper slug generator or DB field
  return encodeURIComponent(name);
}

const DATA_2023: CommentatorScore[] = [
  { name: "槙原寛己",   slug: makeSlug("槙原寛己"),   source: "テレビ",   centralScore: 24, pacificScore: 16, totalScore: 40 },
  { name: "藤田平",     slug: makeSlug("藤田平"),     source: "ラジオ",   centralScore: 20, pacificScore: 20, totalScore: 40 },
  { name: "岩田稔",     slug: makeSlug("岩田稔"),     source: "YouTube", centralScore: 22, pacificScore: 18, totalScore: 40 },
  { name: "掛布雅之",   slug: makeSlug("掛布雅之"),   source: "テレビ",   centralScore: 18, pacificScore: 18, totalScore: 36 },
  { name: "鳥谷敬",     slug: makeSlug("鳥谷敬"),     source: "YouTube", centralScore: 20, pacificScore: 16, totalScore: 36 },
  { name: "谷繁元信",   slug: makeSlug("谷繁元信"),   source: "テレビ",   centralScore: 16, pacificScore: 18, totalScore: 34 },
  { name: "高橋慶彦",   slug: makeSlug("高橋慶彦"),   source: "ラジオ",   centralScore: 18, pacificScore: 14, totalScore: 32 },
  { name: "江本孟紀",   slug: makeSlug("江本孟紀"),   source: "YouTube", centralScore: 14, pacificScore: 16, totalScore: 30 },
  { name: "里崎智也",   slug: makeSlug("里崎智也"),   source: "YouTube", centralScore: 12, pacificScore: 16, totalScore: 28 },
  { name: "野村弘樹",   slug: makeSlug("野村弘樹"),   source: "テレビ",   centralScore: 16, pacificScore: 10, totalScore: 26 },
  { name: "松田宣浩",   slug: makeSlug("松田宣浩"),   source: "YouTube", centralScore: 14, pacificScore: 10, totalScore: 24 },
  { name: "田尾安志",   slug: makeSlug("田尾安志"),   source: "テレビ",   centralScore: 10, pacificScore: 12, totalScore: 22 },
  { name: "金村義明",   slug: makeSlug("金村義明"),   source: "ラジオ",   centralScore: 8,  pacificScore: 12, totalScore: 20 },
  { name: "平石洋介",   slug: makeSlug("平石洋介"),   source: "YouTube", centralScore: 10, pacificScore: 8,  totalScore: 18 },
  { name: "高木豊",     slug: makeSlug("高木豊"),     source: "YouTube", centralScore: 12, pacificScore: 4,  totalScore: 16 },
];

const DATA_2024: CommentatorScore[] = [
  { name: "江本孟紀",   slug: makeSlug("江本孟紀"),   source: "YouTube", centralScore: 48, pacificScore: 48, totalScore: 96 },
  { name: "谷繁元信",   slug: makeSlug("谷繁元信"),   source: "テレビ",   centralScore: 42, pacificScore: 42, totalScore: 84 },
  { name: "鳥谷敬",     slug: makeSlug("鳥谷敬"),     source: "YouTube", centralScore: 44, pacificScore: 40, totalScore: 84 },
  { name: "里崎智也",   slug: makeSlug("里崎智也"),   source: "YouTube", centralScore: 36, pacificScore: 42, totalScore: 78 },
  { name: "松田宣浩",   slug: makeSlug("松田宣浩"),   source: "YouTube", centralScore: 34, pacificScore: 38, totalScore: 72 },
  { name: "高木豊",     slug: makeSlug("高木豊"),     source: "YouTube", centralScore: 38, pacificScore: 30, totalScore: 68 },
  { name: "槙原寛己",   slug: makeSlug("槙原寛己"),   source: "テレビ",   centralScore: 32, pacificScore: 34, totalScore: 66 },
  { name: "掛布雅之",   slug: makeSlug("掛布雅之"),   source: "テレビ",   centralScore: 36, pacificScore: 28, totalScore: 64 },
  { name: "藤田平",     slug: makeSlug("藤田平"),     source: "ラジオ",   centralScore: 30, pacificScore: 30, totalScore: 60 },
  { name: "野村弘樹",   slug: makeSlug("野村弘樹"),   source: "テレビ",   centralScore: 28, pacificScore: 28, totalScore: 56 },
  { name: "岩田稔",     slug: makeSlug("岩田稔"),     source: "YouTube", centralScore: 26, pacificScore: 28, totalScore: 54 },
  { name: "田尾安志",   slug: makeSlug("田尾安志"),   source: "テレビ",   centralScore: 24, pacificScore: 26, totalScore: 50 },
  { name: "金村義明",   slug: makeSlug("金村義明"),   source: "ラジオ",   centralScore: 22, pacificScore: 24, totalScore: 46 },
  { name: "平石洋介",   slug: makeSlug("平石洋介"),   source: "YouTube", centralScore: 20, pacificScore: 22, totalScore: 42 },
  { name: "高橋慶彦",   slug: makeSlug("高橋慶彦"),   source: "ラジオ",   centralScore: 18, pacificScore: 20, totalScore: 38 },
];

const DATA_2025: CommentatorScore[] = [
  { name: "鳥谷敬",     slug: makeSlug("鳥谷敬"),     source: "YouTube", centralScore: 48, pacificScore: 42, totalScore: 90 },
  { name: "江本孟紀",   slug: makeSlug("江本孟紀"),   source: "YouTube", centralScore: 40, pacificScore: 42, totalScore: 82 },
  { name: "平石洋介",   slug: makeSlug("平石洋介"),   source: "YouTube", centralScore: 44, pacificScore: 38, totalScore: 82 },
  { name: "田尾安志",   slug: makeSlug("田尾安志"),   source: "テレビ",   centralScore: 38, pacificScore: 38, totalScore: 76 },
  { name: "野村弘樹",   slug: makeSlug("野村弘樹"),   source: "テレビ",   centralScore: 36, pacificScore: 36, totalScore: 72 },
  { name: "槙原寛己",   slug: makeSlug("槙原寛己"),   source: "テレビ",   centralScore: 34, pacificScore: 34, totalScore: 68 },
  { name: "高木豊",     slug: makeSlug("高木豊"),     source: "YouTube", centralScore: 32, pacificScore: 32, totalScore: 64 },
  { name: "谷繁元信",   slug: makeSlug("谷繁元信"),   source: "テレビ",   centralScore: 30, pacificScore: 30, totalScore: 60 },
  { name: "里崎智也",   slug: makeSlug("里崎智也"),   source: "YouTube", centralScore: 28, pacificScore: 28, totalScore: 56 },
  { name: "掛布雅之",   slug: makeSlug("掛布雅之"),   source: "テレビ",   centralScore: 26, pacificScore: 26, totalScore: 52 },
  { name: "松田宣浩",   slug: makeSlug("松田宣浩"),   source: "YouTube", centralScore: 24, pacificScore: 24, totalScore: 48 },
  { name: "金村義明",   slug: makeSlug("金村義明"),   source: "ラジオ",   centralScore: 22, pacificScore: 22, totalScore: 44 },
  { name: "岩田稔",     slug: makeSlug("岩田稔"),     source: "YouTube", centralScore: 20, pacificScore: 20, totalScore: 40 },
  { name: "藤田平",     slug: makeSlug("藤田平"),     source: "ラジオ",   centralScore: 18, pacificScore: 18, totalScore: 36 },
  { name: "高橋慶彦",   slug: makeSlug("高橋慶彦"),   source: "ラジオ",   centralScore: 16, pacificScore: 16, totalScore: 32 },
];

export const COMMENTATOR_DATA: CommentatorYearData[] = [
  { year: 2023, commentators: DATA_2023 },
  { year: 2024, commentators: DATA_2024 },
  { year: 2025, commentators: DATA_2025 },
];

export const AVAILABLE_YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export const TOTAL_COMMENTATOR_COUNT = 156;

export type LeagueFilter = "all" | "central" | "pacific";
export type SortKey = "score" | "name";

export function getFilteredCommentators(
  year: number | "all",
  league: LeagueFilter,
  search: string,
  sort: SortKey,
): CommentatorScore[] {
  let pool: CommentatorScore[];

  if (year === "all") {
    // Aggregate across all years — sum scores per commentator
    const map = new Map<string, CommentatorScore>();
    for (const yd of COMMENTATOR_DATA) {
      for (const c of yd.commentators) {
        const existing = map.get(c.name);
        if (existing) {
          existing.centralScore += c.centralScore;
          existing.pacificScore += c.pacificScore;
          existing.totalScore += c.totalScore;
        } else {
          map.set(c.name, { ...c });
        }
      }
    }
    pool = Array.from(map.values());
  } else {
    const found = COMMENTATOR_DATA.find((d) => d.year === year);
    pool = found ? found.commentators.map((c) => ({ ...c })) : [];
  }

  // Recompute effective score based on league filter
  if (league === "central") {
    pool = pool.map((c) => ({ ...c, totalScore: c.centralScore }));
  } else if (league === "pacific") {
    pool = pool.map((c) => ({ ...c, totalScore: c.pacificScore }));
  }

  // Search filter
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    pool = pool.filter((c) => c.name.toLowerCase().includes(q));
  }

  // Sort
  if (sort === "name") {
    pool.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  } else {
    pool.sort((a, b) => b.totalScore - a.totalScore);
  }

  return pool;
}

/**
 * Get a single commentator's data across all years by slug.
 * Returns null if slug not found.
 */
export function getCommentatorBySlug(slug: string): {
  name: string;
  slug: string;
  source: SourceBadge;
  years: { year: number; centralScore: number; pacificScore: number; totalScore: number }[];
  allTimeTotal: number;
} | null {
  // Find the commentator in any year
  let name = "";
  let source: SourceBadge = "YouTube";
  let foundSlug = "";
  const years: { year: number; centralScore: number; pacificScore: number; totalScore: number }[] = [];

  for (const yd of COMMENTATOR_DATA) {
    const found = yd.commentators.find((c) => c.slug === slug);
    if (found) {
      name = found.name;
      source = found.source;
      foundSlug = found.slug;
      years.push({
        year: yd.year,
        centralScore: found.centralScore,
        pacificScore: found.pacificScore,
        totalScore: found.totalScore,
      });
    }
  }

  if (!foundSlug) return null;

  const allTimeTotal = years.reduce((sum, y) => sum + y.totalScore, 0);
  return { name, slug: foundSlug, source, years, allTimeTotal };
}

/**
 * Get all unique commentator slugs across all years.
 */
export function getAllCommentatorSlugs(): string[] {
  const slugs = new Set<string>();
  for (const yd of COMMENTATOR_DATA) {
    for (const c of yd.commentators) {
      slugs.add(c.slug);
    }
  }
  return Array.from(slugs);
}

/**
 * Get top N commentators for a given year, sorted by totalScore descending.
 */
export function getTopCommentatorsForYear(
  year: number,
  limit = 20,
): CommentatorScore[] {
  const found = COMMENTATOR_DATA.find((d) => d.year === year);
  if (!found) return [];
  return [...found.commentators]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
}

export const SOURCE_BADGE_COLORS: Record<SourceBadge, { bg: string; border: string; text: string }> = {
  YouTube:  { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  text: "#fca5a5" },
  "新聞":   { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)", text: "#94a3b8" },
  "テレビ":  { bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.25)",  text: "#7dd3fc" },
  "ラジオ":  { bg: "rgba(168,85,247,0.08)",  border: "rgba(168,85,247,0.25)",  text: "#c4b5fd" },
  "雑誌":   { bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.25)",  text: "#6ee7b7" },
  Web:     { bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)",  text: "#fcd34d" },
};
