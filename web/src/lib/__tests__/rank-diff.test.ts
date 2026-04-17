import { describe, it, expect } from "vitest";
import { diffStandings } from "../rank-diff";
import type { ScrapedStanding } from "../scrape-npb";

const cl = (rank: number, teamName: string): ScrapedStanding => ({
  league: "central",
  rank,
  teamName,
  wins: 70,
  losses: 50,
  draws: 3,
});

describe("diffStandings", () => {
  it("marks all teams as 'new' when there is no previous snapshot", () => {
    const next = [cl(1, "阪神タイガース"), cl(2, "読売ジャイアンツ")];
    const r = diffStandings([], next);
    expect(r.changed.length).toBe(2);
    expect(r.changed[0].direction).toBe("new");
    expect(r.changed[0].prevRank).toBeNull();
  });

  it("detects 'up' and 'down' moves with correct delta", () => {
    const prev = [
      { league: "central" as const, rank: 1, teamName: "読売ジャイアンツ" },
      { league: "central" as const, rank: 2, teamName: "阪神タイガース" },
    ];
    const next = [cl(1, "阪神タイガース"), cl(2, "読売ジャイアンツ")];
    const r = diffStandings(prev, next);

    const hanshin = r.changes.find((c) => c.teamName === "阪神タイガース")!;
    const giants = r.changes.find((c) => c.teamName === "読売ジャイアンツ")!;

    expect(hanshin.direction).toBe("up");
    expect(hanshin.delta).toBe(1); // 2→1 = +1
    expect(giants.direction).toBe("down");
    expect(giants.delta).toBe(-1); // 1→2 = -1
    expect(r.changed.length).toBe(2);
  });

  it("marks unchanged teams as 'same' and excludes them from changed", () => {
    const prev = [
      { league: "central" as const, rank: 3, teamName: "中日ドラゴンズ" },
    ];
    const next = [cl(3, "中日ドラゴンズ")];
    const r = diffStandings(prev, next);
    expect(r.changed.length).toBe(0);
    expect(r.changes[0].direction).toBe("same");
    expect(r.changes[0].delta).toBe(0);
  });

  it("topMoves orders by |delta| descending, max 3 entries", () => {
    const prev = [
      { league: "central" as const, rank: 1, teamName: "A" },
      { league: "central" as const, rank: 2, teamName: "B" },
      { league: "central" as const, rank: 3, teamName: "C" },
      { league: "central" as const, rank: 6, teamName: "D" },
    ];
    const next: ScrapedStanding[] = [
      { league: "central", rank: 6, teamName: "A", wins: 0, losses: 0, draws: 0 }, // -5
      { league: "central", rank: 1, teamName: "D", wins: 0, losses: 0, draws: 0 }, // +5
      { league: "central", rank: 3, teamName: "B", wins: 0, losses: 0, draws: 0 }, // -1
      { league: "central", rank: 2, teamName: "C", wins: 0, losses: 0, draws: 0 }, // +1
    ];
    const r = diffStandings(prev, next);
    expect(r.topMoves.length).toBe(3);
    expect(Math.abs(r.topMoves[0].delta)).toBe(5);
    expect(Math.abs(r.topMoves[1].delta)).toBe(5);
    expect(Math.abs(r.topMoves[2].delta)).toBe(1);
  });

  it("treats teams present in next but missing from prev as 'new'", () => {
    const prev = [
      { league: "central" as const, rank: 1, teamName: "阪神タイガース" },
    ];
    const next = [cl(1, "阪神タイガース"), cl(2, "読売ジャイアンツ")];
    const r = diffStandings(prev, next);
    const newEntry = r.changes.find((c) => c.teamName === "読売ジャイアンツ")!;
    expect(newEntry.direction).toBe("new");
    expect(newEntry.prevRank).toBeNull();
  });
});
