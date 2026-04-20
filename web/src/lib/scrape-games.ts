/**
 * Scrape NPB game results for a given date from Yahoo Sports Navi.
 * URL pattern: https://baseball.yahoo.co.jp/npb/schedule/?date=YYYY-MM-DD
 * Edge-runtime safe.
 */

import { NPB_TEAMS } from "@/lib/teams";
import type { GameLeague, GameStatus } from "@/db/schema";

export interface ScrapedGame {
  gameDate: string;          // "2026-04-19"
  league: GameLeague;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  winner: "home" | "away" | "tie" | null;
  stadium: string | null;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

function headers(): HeadersInit {
  return {
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9",
    "Referer": "https://baseball.yahoo.co.jp/",
  };
}

function mapTeam(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const team = NPB_TEAMS.find(
    (t) =>
      trimmed === t.shortName ||
      trimmed === t.name ||
      trimmed.startsWith(t.shortName),
  );
  return team?.name ?? null;
}

function gameLeague(homeTeam: string, awayTeam: string): GameLeague {
  const home = NPB_TEAMS.find((t) => t.name === homeTeam);
  const away = NPB_TEAMS.find((t) => t.name === awayTeam);
  if (!home || !away) return "interleague";
  return home.league === away.league ? home.league : "interleague";
}

/**
 * Parse Yahoo schedule HTML for a given date.
 * The page lists each game as a block with team names, scores, and status.
 */
export function parseYahooSchedule(html: string, date: string): ScrapedGame[] {
  const games: ScrapedGame[] = [];

  // Match each <li class="bb-score ..."> ... </li> block
  const liRegex = /<li[^>]*class="[^"]*bb-score[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;

  while ((m = liRegex.exec(html)) !== null) {
    const block = m[1];

    // Extract team names (2 per block) — typically in .bb-score__homeName / __awayName
    const teamRegex = /class="[^"]*bb-score__(?:home|away)Name[^"]*"[^>]*>([^<]+)</g;
    const teams: string[] = [];
    let tm: RegExpExecArray | null;
    while ((tm = teamRegex.exec(block)) !== null) {
      const team = mapTeam(tm[1]);
      if (team) teams.push(team);
    }
    if (teams.length < 2) continue;
    const [awayTeam, homeTeam] = teams;

    // Extract scores — two numeric values in .bb-score__scoreValue
    const scoreRegex = /class="[^"]*bb-score__score[^"]*"[^>]*>[\s\S]*?<[^>]*>\s*(-|\d+)\s*</g;
    const scores: (number | null)[] = [];
    let sm: RegExpExecArray | null;
    while ((sm = scoreRegex.exec(block)) !== null) {
      const v = sm[1];
      if (v === "-") scores.push(null);
      else scores.push(parseInt(v, 10));
    }
    const [awayScore, homeScore] = scores.length >= 2 ? scores : [null, null];

    // Status: look for .bb-score__status or similar
    const statusMatch = block.match(
      /class="[^"]*bb-score__status[^"]*"[^>]*>([^<]+)</,
    );
    const rawStatus = statusMatch?.[1].trim() ?? "";
    let status: GameStatus = "scheduled";
    let winner: ScrapedGame["winner"] = null;
    if (rawStatus.includes("試合終了") || rawStatus === "結果") {
      status = "final";
      if (homeScore !== null && awayScore !== null) {
        if (homeScore > awayScore) winner = "home";
        else if (awayScore > homeScore) winner = "away";
        else winner = "tie";
      }
    } else if (rawStatus.includes("中止") || rawStatus.includes("中断")) {
      status = rawStatus.includes("中止") ? "postponed" : "in_progress";
    } else if (rawStatus.match(/\d+回|試合中/)) {
      status = "in_progress";
    }

    // Stadium
    const stadiumMatch = block.match(/class="[^"]*bb-score__stadium[^"]*"[^>]*>([^<]+)</);
    const stadium = stadiumMatch?.[1].trim() ?? null;

    games.push({
      gameDate: date,
      league: gameLeague(homeTeam, awayTeam),
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      status,
      winner,
      stadium,
    });
  }

  return games;
}

export async function scrapeYahooGames(date: string): Promise<ScrapedGame[]> {
  const url = `https://baseball.yahoo.co.jp/npb/schedule/?date=${date.replace(/-/g, "")}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Yahoo schedule fetch failed: ${res.status}`);
  const html = await res.text();
  return parseYahooSchedule(html, date);
}
