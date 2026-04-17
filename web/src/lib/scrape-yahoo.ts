/**
 * Scrapes NPB standings from Yahoo! Sports Navi (baseball.yahoo.co.jp).
 *
 * Origin obfuscation:
 * - Rotates User-Agents from real browsers
 * - Sets realistic Referer from Yahoo search / home
 * - Accept-Language: ja
 * - Accept-Encoding: gzip so edge runtime handles decoding
 *
 * Works in edge runtime (fetch only, no cheerio/DOM).
 */
import { NPB_TEAMS } from "@/lib/teams";
import type { ScrapedStanding } from "@/lib/scrape-npb";

const YAHOO_URLS = {
  central: "https://baseball.yahoo.co.jp/npb/standings/",
  pacific: "https://baseball.yahoo.co.jp/npb/standings/?league=2",
} as const;

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

const REFERERS = [
  "https://search.yahoo.co.jp/",
  "https://www.yahoo.co.jp/",
  "https://baseball.yahoo.co.jp/",
  "https://www.google.com/",
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function obfuscatedHeaders(): HeadersInit {
  return {
    "User-Agent": pickRandom(USER_AGENTS),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": pickRandom(REFERERS),
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Cache-Control": "no-cache",
  };
}

/**
 * Parse Yahoo standings HTML.
 * The standings table has class names starting with "bb-rankTable" and rows
 * begin with a rank <td>.  Structure varies; we use looser regexes.
 */
export function parseYahooStandings(
  html: string,
  league: "central" | "pacific",
): ScrapedStanding[] {
  const results: ScrapedStanding[] = [];

  // Grab the ranking table block (tolerate class name evolution)
  const blockMatch = html.match(
    /<table[^>]*class="[^"]*(?:bb-rankTable|rankTable|standingsTable)[^"]*"[^>]*>([\s\S]*?)<\/table>/,
  );
  if (!blockMatch) return results;

  const tableHtml = blockMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(
      (m) =>
        m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
    );

    // Expect: [rank, team, games, wins, losses, draws, ...]
    if (cells.length < 6) continue;
    const rank = parseInt(cells[0], 10);
    if (Number.isNaN(rank) || rank < 1 || rank > 6) continue;

    const rawName = cells[1];
    const team = NPB_TEAMS.find(
      (t) =>
        rawName.includes(t.shortName) ||
        rawName === t.name ||
        rawName.startsWith(t.shortName),
    );
    if (!team || team.league !== league) continue;

    const wins = parseInt(cells[3], 10);
    const losses = parseInt(cells[4], 10);
    const draws = parseInt(cells[5], 10);

    results.push({
      league: team.league,
      rank,
      teamName: team.name,
      wins: Number.isNaN(wins) ? 0 : wins,
      losses: Number.isNaN(losses) ? 0 : losses,
      draws: Number.isNaN(draws) ? 0 : draws,
    });
  }

  return results;
}

export async function scrapeYahooStandings(): Promise<ScrapedStanding[]> {
  const [clRes, plRes] = await Promise.all([
    fetch(YAHOO_URLS.central, { headers: obfuscatedHeaders() }),
    fetch(YAHOO_URLS.pacific, { headers: obfuscatedHeaders() }),
  ]);

  if (!clRes.ok || !plRes.ok) {
    throw new Error(
      `Yahoo fetch failed: CL=${clRes.status} PL=${plRes.status}`,
    );
  }

  const [clHtml, plHtml] = await Promise.all([clRes.text(), plRes.text()]);

  return [
    ...parseYahooStandings(clHtml, "central"),
    ...parseYahooStandings(plHtml, "pacific"),
  ];
}
