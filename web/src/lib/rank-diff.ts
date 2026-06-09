/**
 * Detect rank changes between two standings snapshots.
 */
import type { ScrapedStanding } from "@/lib/scrape-npb";

export type RankDirection = "up" | "down" | "same" | "new";

export interface RankChange {
  league: "central" | "pacific";
  teamName: string;
  prevRank: number | null;
  newRank: number;
  delta: number; // positive=moved up (smaller rank), negative=moved down
  direction: RankDirection;
  standingsChanged: boolean;
  wins: number;
  losses: number;
  draws: number;
}

export interface RankDiffResult {
  changes: RankChange[];
  changed: RankChange[]; // only rows where direction !== "same"
  topMoves: RankChange[]; // largest |delta| first, capped at 3
}

export function diffStandings(
  prev: (Pick<ScrapedStanding, "league" | "rank" | "teamName"> &
    Partial<Pick<ScrapedStanding, "wins" | "losses" | "draws">>)[],
  next: ScrapedStanding[],
): RankDiffResult {
  const prevMap = new Map<string, (typeof prev)[number]>();
  for (const p of prev) {
    prevMap.set(`${p.league}:${p.teamName}`, p);
  }

  const changes: RankChange[] = next.map((n) => {
    const key = `${n.league}:${n.teamName}`;
    const previous = prevMap.get(key) ?? null;
    const prevRank = previous?.rank ?? null;
    const delta = prevRank === null ? 0 : prevRank - n.rank;
    let direction: RankDirection;
    if (prevRank === null) direction = "new";
    else if (delta > 0) direction = "up";
    else if (delta < 0) direction = "down";
    else direction = "same";
    const statsChanged =
      previous !== null &&
      typeof previous.wins === "number" &&
      typeof previous.losses === "number" &&
      typeof previous.draws === "number" &&
      (previous.wins !== n.wins ||
        previous.losses !== n.losses ||
        previous.draws !== n.draws);
    return {
      league: n.league,
      teamName: n.teamName,
      prevRank,
      newRank: n.rank,
      delta,
      direction,
      standingsChanged: direction !== "same" || statsChanged,
      wins: n.wins,
      losses: n.losses,
      draws: n.draws,
    };
  });

  const changed = changes.filter((c) => c.standingsChanged);
  const topMoves = [...changed]
    .filter((c) => c.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  return { changes, changed, topMoves };
}
