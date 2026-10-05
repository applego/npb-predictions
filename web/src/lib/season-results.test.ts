import { describe, expect, it } from "vitest";
import { NPB_TEAMS } from "./teams";
import { latestResultSnapshot, safeSourceUrl, summarizeResults, type PublicResultPick, type ResultLeague, type ResultStanding } from "./season-results";
import { parseResultsQuery } from "./results-query";

const now = Date.parse("2026-10-05T00:00:00Z");
const date = "2026-10-04T13:00:00Z";
function standings(league: ResultLeague = "central", final = false): ResultStanding[] {
  return NPB_TEAMS.filter((team) => team.league === league).map((team, index) => ({ league, rank: index + 1, teamName: team.name, snapshotDate: date, isFinal: final }));
}
function picks(userId = 1, league: ResultLeague = "central", ranks = [1, 2, 3, 4, 5, 6]): PublicResultPick[] {
  return standings(league).map((row, index) => ({ league, rank: ranks[index], teamName: row.teamName, predictionId: userId, userId, name: `テスト予想者${userId}`, slug: `test-${userId}`, source: "検証用", sourceUrl: "https://example.com", variant: null, createdAt: "2026-03-01T00:00:00Z" }));
}
describe("public season result integrity", () => {
  it("never derives final status from the calendar", () => {
    const summary = summarizeResults(picks(), standings(), "central", Date.parse("2027-01-01T00:00:00Z"));
    expect(summary.status).toBe("provisional"); expect(summary.perfect).toBe(1);
  });
  it("requires every team to be explicitly final", () => {
    const rows = standings("central", true); rows[5].isFinal = false;
    expect(latestResultSnapshot(rows, "central", now).status).toBe("provisional");
    rows[5].isFinal = true;
    expect(latestResultSnapshot(rows, "central", now).status).toBe("final");
  });
  it("does not fill gaps in a new snapshot with old rows", () => {
    const rows = [...standings(), { ...standings()[0], snapshotDate: "2026-10-04T23:00:00Z" }];
    expect(latestResultSnapshot(rows, "central", now).status).toBe("unavailable");
    expect(summarizeResults(picks(), rows, "central", now).perfect).toBeNull();
  });
  it("rejects duplicate ranks and teams", () => {
    const ranks = standings(); ranks[5].rank = 1;
    expect(latestResultSnapshot(ranks, "central", now).status).toBe("unavailable");
    const teams = standings(); teams[5].teamName = teams[0].teamName;
    expect(latestResultSnapshot(teams, "central", now).status).toBe("unavailable");
  });
  it("rejects invalid or future timestamps", () => {
    const bad = standings().map((row) => ({ ...row, snapshotDate: "bad-date" }));
    expect(latestResultSnapshot(bad, "central", now).status).toBe("unavailable");
    const future = standings().map((row) => ({ ...row, snapshotDate: "2027-01-01T00:00:00Z" }));
    expect(latestResultSnapshot(future, "central", now).status).toBe("unavailable");
  });
  it("flags stale provisional data but not old final results", () => {
    expect(latestResultSnapshot(standings(), "central", now + 40 * 3600000).stale).toBe(true);
    expect(latestResultSnapshot(standings("central", true), "central", now + 40 * 3600000).stale).toBe(false);
  });
  it("normalizes abbreviated team names", () => {
    const short = picks().map((pick, i) => ({ ...pick, teamName: NPB_TEAMS[i].shortName }));
    expect(summarizeResults(short, standings(), "central", now).entries[0].exact).toBe(6);
  });
  it("does not mark no-data or no-eligible-picks as zero perfect predictions", () => {
    expect(summarizeResults([], standings(), "central", now).perfect).toBeNull();
    expect(summarizeResults(picks(), [], "central", now).perfect).toBeNull();
  });
  it("counts zero only when a valid comparison exists", () => {
    expect(summarizeResults(picks(1, "central", [2, 1, 3, 4, 5, 6]), standings(), "central", now).perfect).toBe(0);
  });
  it("excludes incomplete or cross-league picks", () => {
    const partial = picks().slice(0, 5);
    expect(summarizeResults(partial, standings(), "central", now).eligible).toBe(0);
    const wrong = picks(); wrong[0].teamName = standings("pacific")[0].teamName;
    expect(summarizeResults(wrong, standings(), "central", now).eligible).toBe(0);
  });
  it("all leagues requires all twelve predictions and both result snapshots", () => {
    expect(summarizeResults(picks(), [...standings(), ...standings("pacific")], "all", now).eligible).toBe(0);
    const both = [...picks(), ...picks(1, "pacific")];
    expect(summarizeResults(both, standings(), "all", now).status).toBe("unavailable");
    const complete = summarizeResults(both, [...standings(), ...standings("pacific")], "all", now);
    expect(complete.target).toBe(12); expect(complete.entries[0].exact).toBe(12);
  });
  it("league finality is independent", () => {
    const rows = [...standings("central", true), ...standings("pacific", false)];
    const both = [...picks(), ...picks(1, "pacific")];
    expect(summarizeResults(both, rows, "central", now).status).toBe("final");
    expect(summarizeResults(both, rows, "all", now).status).toBe("provisional");
  });
  it("selects the original variant before comparing results", () => {
    const original = picks(1, "central", [2, 1, 3, 4, 5, 6]);
    const better = picks().map((pick) => ({ ...pick, predictionId: 10, variant: "②", createdAt: "2026-02-01T00:00:00Z" }));
    const summary = summarizeResults([...better, ...original], standings(), "central", now);
    expect(summary.eligible).toBe(1); expect(summary.entries[0].exact).toBe(4); expect(summary.perfect).toBe(0);
  });
  it("assigns equal ranks for tied results", () => {
    const summary = summarizeResults([...picks(1), ...picks(2), ...picks(3, "central", [2,1,3,4,5,6])], standings(), "central", now);
    expect(summary.entries.map((entry) => entry.rank)).toEqual([1,1,3]);
  });
  it("uses total deviation as the secondary comparison", () => {
    const summary = summarizeResults([...picks(1, "central", [3,2,1,4,5,6]), ...picks(2, "central", [2,1,3,4,5,6])], standings(), "central", now);
    expect(summary.entries.map((entry) => entry.userId)).toEqual([2,1]);
  });
  it("only permits HTTP source links", () => {
    expect(safeSourceUrl("javascript:alert(1)")).toBeNull(); expect(safeSourceUrl("data:text/html,test")).toBeNull();
    expect(safeSourceUrl("/relative")).toBeNull(); expect(safeSourceUrl("https://example.com/a")).toBe("https://example.com/a");
  });
});
describe("result URL validation", () => {
  it("defaults to the Central League", () => { expect(parseResultsQuery({})).toEqual({ year: undefined, scope: "central", valid: true }); });
  it("preserves the requested year and league", () => { expect(parseResultsQuery({ year: "2025", league: "pacific" })).toEqual({ year: 2025, scope: "pacific", valid: true }); });
  it("rejects partial numbers and unknown leagues", () => { expect(parseResultsQuery({ year: "2026oops" }).valid).toBe(false); expect(parseResultsQuery({ league: "evil" }).valid).toBe(false); });
  it("handles repeated query keys deterministically", () => { expect(parseResultsQuery({ year: ["2025", "2026"], league: ["all", "central"] }).scope).toBe("all"); });
});
