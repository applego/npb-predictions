import { describe, it, expect } from "vitest";
import { latestRankMap } from "../scoring";

describe("latestRankMap", () => {
  it("scores against the newest snapshot even when older rows come first", () => {
    const rows = [
      { league: "central", teamName: "阪神タイガース", rank: 3, snapshotDate: new Date("2026-04-10") },
      { league: "central", teamName: "読売ジャイアンツ", rank: 1, snapshotDate: new Date("2026-04-10") },
      { league: "central", teamName: "阪神タイガース", rank: 1, snapshotDate: new Date("2026-10-05") },
      { league: "central", teamName: "読売ジャイアンツ", rank: 2, snapshotDate: new Date("2026-10-05") },
      { league: "pacific", teamName: "福岡ソフトバンクホークス", rank: 1, snapshotDate: new Date("2026-09-30") },
    ];
    const map = latestRankMap(rows);
    expect(map.get("central")?.get("阪神タイガース")).toBe(1);
    expect(map.get("central")?.get("読売ジャイアンツ")).toBe(2);
    expect(map.get("pacific")?.get("福岡ソフトバンクホークス")).toBe(1);
  });
});
