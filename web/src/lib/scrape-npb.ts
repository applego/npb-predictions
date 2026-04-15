/**
 * Scrapes the current NPB standings from npb.jp.
 * Works in edge runtime (fetch only, no cheerio/DOM).
 */
import { NPB_TEAMS } from "@/lib/teams";

export interface ScrapedStanding {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
}

function parseStandingsHtml(html: string): ScrapedStanding[] {
  const results: ScrapedStanding[] = [];

  // Extract the first <table> inside the standings div
  const tableMatch = html.match(
    /class="standing_table">[\s\S]*?<table>([\s\S]*?)<\/table>/
  );
  if (!tableMatch) return results;

  const tableHtml = tableMatch[1];
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
  let rowMatch: RegExpExecArray | null;
  let rank = 0;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(
      (m) => m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim()
    );

    // Header row has non-numeric values in cols 1+
    if (cells.length < 5 || Number.isNaN(parseInt(cells[1], 10))) continue;

    const rawName = cells[0];
    const team = NPB_TEAMS.find((t) => rawName.startsWith(t.name));
    if (!team) continue;

    rank++;
    results.push({
      league: team.league,
      rank,
      teamName: team.name,
      wins: parseInt(cells[2], 10),
      losses: parseInt(cells[3], 10),
      draws: parseInt(cells[4], 10),
    });
  }

  return results;
}

export async function scrapeNpbStandings(): Promise<ScrapedStanding[]> {
  const [clRes, plRes] = await Promise.all([
    fetch("https://npb.jp/cl/", { headers: { "User-Agent": "NPBLeagueBot/1.0" } }),
    fetch("https://npb.jp/pl/", { headers: { "User-Agent": "NPBLeagueBot/1.0" } }),
  ]);

  if (!clRes.ok || !plRes.ok) {
    throw new Error(
      `NPB fetch failed: CL=${clRes.status} PL=${plRes.status}`
    );
  }

  const [clHtml, plHtml] = await Promise.all([clRes.text(), plRes.text()]);

  return [
    ...parseStandingsHtml(clHtml),
    ...parseStandingsHtml(plHtml),
  ];
}
