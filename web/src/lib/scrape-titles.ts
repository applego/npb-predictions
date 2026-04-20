/**
 * Scrape NPB title leaders (打率王, 本塁打王, etc.) from npb.jp stats pages.
 * Edge-runtime safe (fetch + regex only, no DOM libs).
 *
 * Sources:
 *   https://npb.jp/bis/2026/stats/bat_c.html  (Central 打撃)
 *   https://npb.jp/bis/2026/stats/bat_p.html  (Pacific 打撃)
 *   https://npb.jp/bis/2026/stats/pit_c.html  (Central 投手)
 *   https://npb.jp/bis/2026/stats/pit_p.html  (Pacific 投手)
 */

import { NPB_TEAMS } from "@/lib/teams";

export type ScrapedTitleCategory =
  | "batting_avg"
  | "home_runs"
  | "rbi"
  | "wins"
  | "era"
  | "saves";

export interface ScrapedTitle {
  league: "central" | "pacific";
  category: ScrapedTitleCategory;
  rank: number;           // 1..3 (top 3)
  playerName: string;
  teamName: string | null;
  value: number;
}

// Column label in the npb.jp header row → our category
const BATTING_COLUMNS: Record<string, ScrapedTitleCategory> = {
  "打率": "batting_avg",
  "本塁打": "home_runs",
  "打点": "rbi",
};
const PITCHING_COLUMNS: Record<string, ScrapedTitleCategory> = {
  "勝利": "wins",
  "防御率": "era",
  "セーブ": "saves",
};

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

function headers(): HeadersInit {
  return {
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9",
    "Referer": "https://npb.jp/",
  };
}

function mapTeamShort(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // npb.jp uses 2-char abbreviations in stats tables (神, 巨, 広, ディ, ヤ, 中, ソ, オ, 楽, ロ, 日, 西)
  const abbrMap: Record<string, string> = {
    "神": "阪神タイガース",
    "巨": "読売ジャイアンツ",
    "広": "広島東洋カープ",
    "デ": "横浜DeNAベイスターズ",
    "ディ": "横浜DeNAベイスターズ",
    "ヤ": "東京ヤクルトスワローズ",
    "中": "中日ドラゴンズ",
    "ソ": "福岡ソフトバンクホークス",
    "オ": "オリックス・バファローズ",
    "楽": "東北楽天ゴールデンイーグルス",
    "ロ": "千葉ロッテマリーンズ",
    "日": "北海道日本ハムファイターズ",
    "西": "埼玉西武ライオンズ",
  };
  if (abbrMap[trimmed]) return abbrMap[trimmed];
  const team = NPB_TEAMS.find(
    (t) => trimmed.includes(t.shortName) || trimmed === t.name,
  );
  return team?.name ?? trimmed;
}

/**
 * Parse an npb.jp stats page. Each page has multiple small tables; each table
 * represents a single stat. The <caption> or first header cell contains the
 * stat label (e.g. "打率", "本塁打").
 */
export function parseNpbStats(
  html: string,
  league: "central" | "pacific",
  kind: "batting" | "pitching",
): ScrapedTitle[] {
  const columns = kind === "batting" ? BATTING_COLUMNS : PITCHING_COLUMNS;
  const results: ScrapedTitle[] = [];

  // Extract all <table ...> ... </table> blocks
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let m: RegExpExecArray | null;
  while ((m = tableRegex.exec(html)) !== null) {
    const tableHtml = m[1];

    // Identify which stat this table is for: look for a Japanese column label
    // in the first row that matches our mapping.
    let category: ScrapedTitleCategory | null = null;
    for (const [label, cat] of Object.entries(columns)) {
      // Japanese label appears as a cell on its own
      const labelPattern = new RegExp(
        `<t[dh][^>]*>\\s*${label}\\s*<\/t[dh]>`,
      );
      if (labelPattern.test(tableHtml)) {
        category = cat;
        break;
      }
    }
    if (!category) continue;

    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let rowMatch: RegExpExecArray | null;
    let rank = 0;
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const row = rowMatch[1];
      const cells = [
        ...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g),
      ].map((c) =>
        c[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );
      if (cells.length < 3) continue;

      // Expect: [rank, player, team, ..., value]
      const parsedRank = parseInt(cells[0], 10);
      if (Number.isNaN(parsedRank) || parsedRank < 1 || parsedRank > 3) continue;

      const playerName = cells[1];
      const teamShort = cells[2];
      // Value is usually the last numeric cell
      let value: number | null = null;
      for (let i = cells.length - 1; i >= 3; i--) {
        const v = parseFloat(cells[i]);
        if (!Number.isNaN(v)) {
          value = v;
          break;
        }
      }
      if (value === null) continue;
      if (!playerName) continue;

      rank = parsedRank;
      results.push({
        league,
        category,
        rank,
        playerName,
        teamName: mapTeamShort(teamShort),
        value,
      });
    }
  }

  return results;
}

export async function scrapeNpbTitles(year: number): Promise<ScrapedTitle[]> {
  const urls: { url: string; league: "central" | "pacific"; kind: "batting" | "pitching" }[] = [
    { url: `https://npb.jp/bis/${year}/stats/bat_c.html`, league: "central", kind: "batting" },
    { url: `https://npb.jp/bis/${year}/stats/bat_p.html`, league: "pacific", kind: "batting" },
    { url: `https://npb.jp/bis/${year}/stats/pit_c.html`, league: "central", kind: "pitching" },
    { url: `https://npb.jp/bis/${year}/stats/pit_p.html`, league: "pacific", kind: "pitching" },
  ];

  const results = await Promise.all(
    urls.map(async ({ url, league, kind }) => {
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) throw new Error(`NPB titles fetch failed: ${url} ${res.status}`);
      const html = await res.text();
      return parseNpbStats(html, league, kind);
    }),
  );

  return results.flat();
}
