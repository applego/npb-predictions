/** Year-bound official standings; completion is evidence from NPB, never the calendar. */
import { NPB_TEAMS } from "@/lib/teams";

export interface ScrapedStanding {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
  isFinal?: boolean;
}

export function parseOfficialStandings(html: string, year: number, league: "central" | "pacific"): ScrapedStanding[] {
  const label = league === "central" ? "セントラル" : "パシフィック";
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  if (!title.includes(`${year}年度`) || !title.includes(`${label}・リーグ`)) throw new Error("NPB season/league mismatch");
  const match = html.match(/<h4[^>]*>\s*チーム勝敗表\s*<\/h4>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!match) throw new Error("NPB standings table missing");
  const isFinal = /<p[^>]*>\s*全日程終了\s*<\/p>/i.test(html);
  const rows: ScrapedStanding[] = [];
  for (const row of match[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => cell[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim());
    const team = NPB_TEAMS.find((candidate) => candidate.name === cells[0] && candidate.league === league);
    if (!team) continue;
    const numbers = cells.slice(1, 5);
    if (numbers.length !== 4 || numbers.some((n) => !/^\d+$/.test(n))) throw new Error("NPB invalid game counts");
    const [games, wins, losses, draws] = numbers.map(Number);
    if (games !== wins + losses + draws || games === 0) throw new Error("NPB incomplete game counts");
    rows.push({ league, rank: rows.length + 1, teamName: team.name, wins, losses, draws, isFinal });
  }
  if (rows.length !== 6 || new Set(rows.map((row) => row.teamName)).size !== 6) throw new Error("NPB incomplete six-team standings");
  return rows;
}

export async function scrapeNpbStandings(year = new Date().getFullYear()): Promise<ScrapedStanding[]> {
  if (!Number.isInteger(year) || year < 1936 || year > 2100) throw new Error("Invalid season year");
  const leagues = ["central", "pacific"] as const;
  const results = await Promise.all(leagues.map(async (league) => {
    const url = `https://npb.jp/bis/${year}/stats/std_${league === "central" ? "c" : "p"}.html`;
    const response = await fetch(url, { headers: { "User-Agent": "NPBLeagueBot/1.0" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`NPB ${year} ${league} HTTP ${response.status}`);
    return parseOfficialStandings(await response.text(), year, league);
  }));
  return results.flat();
}
