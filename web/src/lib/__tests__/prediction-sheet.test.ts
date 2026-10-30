import { describe, it, expect } from "vitest";
import { decodeOrder, parseSheetQuery, scoreOrder, sheetUrl, sortRows, type SheetRow } from "../prediction-sheet";
import type { ResultSnapshot } from "../season-results";

const central = ["阪神タイガース", "読売ジャイアンツ", "横浜DeNAベイスターズ", "広島東洋カープ", "中日ドラゴンズ", "東京ヤクルトスワローズ"];
const snapshot: ResultSnapshot = {
  league: "central", status: "final", updatedAt: "2026-10-05T00:00:00Z", stale: false,
  rows: central.map((teamName, i) => ({ league: "central", rank: i + 1, teamName, snapshotDate: "2026-10-05T00:00:00Z", isFinal: true })),
};

describe("prediction sheet", () => {
  it("restores the own row from a shared link", () => {
    const q = parseSheetQuery({ league: "central", me: "  たろう ", order: "神,巨,De,広,中,ヤ", picks: "3,3,9" });
    expect(q.me).toEqual({ name: "たろう", order: central });
    expect(q.picks).toEqual([3, 9]);
    const url = new URL(sheetUrl("https://example.test", 2026, q));
    expect(parseSheetQuery(Object.fromEntries(url.searchParams))).toEqual(q);
  });

  it("rejects an order that is not exactly the six teams of the league", () => {
    expect(decodeOrder("神,神,De,広,中,ヤ", "central")).toBeNull();
    expect(decodeOrder("神,巨,De,広,中", "central")).toBeNull();
    expect(decodeOrder("ソ,巨,De,広,中,ヤ", "central")).toBeNull();
    expect(parseSheetQuery({ me: "たろう", order: "神,巨" }).me).toBeNull();
  });

  it("scores hits, total rank gap and points against the actual standings", () => {
    // Predicted 巨人1位・阪神2位, rest correct: two 1-rank misses.
    const order = [central[1], central[0], ...central.slice(2)];
    expect(scoreOrder(order, snapshot)).toEqual({ actualRanks: [2, 1, 3, 4, 5, 6], exact: 4, deviation: 2, points: 4 * 5 + 2 * 3 });
    expect(scoreOrder(order, { ...snapshot, status: "unavailable" })).toBeNull();
  });

  it("sorts by the chosen metric with fewer gaps first for deviation", () => {
    const row = (key: string, exact: number, deviation: number, points: number): SheetRow =>
      ({ key, name: key, isMine: false, order: central, result: { actualRanks: [1, 2, 3, 4, 5, 6], exact, deviation, points } });
    const rows = [row("a", 2, 8, 10), row("b", 4, 4, 20), row("c", 1, 2, 12)];
    expect(sortRows(rows, "exact").map((r) => r.key)).toEqual(["b", "a", "c"]);
    expect(sortRows(rows, "deviation").map((r) => r.key)).toEqual(["c", "b", "a"]);
    expect(sortRows(rows, "points").map((r) => r.key)).toEqual(["b", "c", "a"]);
  });
});
