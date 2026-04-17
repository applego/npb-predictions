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
  prev: Pick<ScrapedStanding, "league" | "rank" | "teamName">[],
  next: ScrapedStanding[],
): RankDiffResult {
  const prevMap = new Map<string, number>();
  for (const p of prev) {
    prevMap.set(`${p.league}:${p.teamName}`, p.rank);
  }

  const changes: RankChange[] = next.map((n) => {
    const key = `${n.league}:${n.teamName}`;
    const prevRank = prevMap.get(key) ?? null;
    const delta = prevRank === null ? 0 : prevRank - n.rank;
    let direction: RankDirection;
    if (prevRank === null) direction = "new";
    else if (delta > 0) direction = "up";
    else if (delta < 0) direction = "down";
    else direction = "same";
    return {
      league: n.league,
      teamName: n.teamName,
      prevRank,
      newRank: n.rank,
      delta,
      direction,
      wins: n.wins,
      losses: n.losses,
      draws: n.draws,
    };
  });

  const changed = changes.filter((c) => c.direction !== "same");
  const topMoves = [...changed]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  return { changes, changed, topMoves };
}
