import { describe, expect, it } from "vitest";
import { resultDate, resultDifference, resultObservation, resultShareTitle, resultState } from "./results-presentation";
import type { ResultEntry, ResultSummary } from "./season-results";
const entry: ResultEntry = {
  userId: 1, predictionId: 1, name: "検証用", slug: "test", source: null, sourceUrl: null,
  variant: null, rank: 1, exact: 4, deviation: 2,
  details: [
    { league: "central", teamName: "阪神タイガース", predictedRank: 2, actualRank: 1, difference: 1 },
    { league: "central", teamName: "読売ジャイアンツ", predictedRank: 1, actualRank: 2, difference: 1 },
  ],
};
const summary: ResultSummary = {
  scope: "central", status: "provisional", target: 6, eligible: 1, excluded: 0, perfect: 0, entries: [entry],
  snapshots: [{ league: "central", status: "provisional", updatedAt: "2026-10-04T13:00:00Z", stale: false, rows: [] }],
};
describe("readable result presentation", () => {
  it("formats the observation explicitly in JST", () => { expect(resultDate("2026-10-04T13:00:00Z")).toBe("2026/10/04 22:00"); });
  it("does not invent an invalid update date", () => { expect(resultDate("bad")).toBe("更新日時未確認"); });
  it("has an unavailable state distinct from provisional", () => { expect(resultState({ ...summary, status: "unavailable" })).toBe("集計保留"); });
  it("labels stale snapshots before sharing", () => { expect(resultState({ ...summary, snapshots: [{ ...summary.snapshots[0], stale: true }] })).toBe("暫定・更新遅延"); });
  it("does not flag historical final results as live", () => { expect(resultState({ ...summary, status: "final" })).toBe("確定"); });
  it("shares scope, provisional status and original observation time", () => {
    const text = resultShareTitle(2026, summary, entry);
    expect(text).toContain("6球団中4球団一致"); expect(text).toContain("暫定");
    expect(text).toContain("2026/10/04 22:00 JST"); expect(text).toContain("セ・リーグ");
  });
  it("preserves separate league observation times in combined views", () => {
    const both = { ...summary, scope: "all" as const, snapshots: [...summary.snapshots, { ...summary.snapshots[0], league: "pacific" as const, updatedAt: "2026-10-03T12:00:00Z" }] };
    expect(resultObservation(both)).toContain("セ・リーグ 2026/10/04 22:00 JST");
    expect(resultObservation(both)).toContain("パ・リーグ 2026/10/03 21:00 JST");
  });
  it("shares unknown timestamps honestly", () => { expect(resultObservation({ ...summary, snapshots: [{ ...summary.snapshots[0], updatedAt: null }] })).toContain("更新日時未確認"); });
  it("exposes a deterministic mismatch without changing the details", () => {
    const original = JSON.stringify(entry.details);
    expect(resultDifference(entry)).toBe("主な差分：巨人 予想1位 → 実順位2位");
    expect(JSON.stringify(entry.details)).toBe(original);
  });
  it("does not call a provisional match a final hit", () => {
    expect(resultDifference({ ...entry, details: [{ ...entry.details[0], difference: 0 }] })).toBe("すべての球団の順位が一致");
  });
  it("does not treat empty details as a perfect result", () => { expect(resultDifference({ ...entry, details: [] })).toBe("内訳を確認中"); });
});
