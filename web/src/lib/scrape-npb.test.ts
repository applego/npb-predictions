import { afterEach, describe, expect, it, vi } from "vitest";
import { NPB_TEAMS } from "./teams";
import { parseOfficialStandings, scrapeNpbStandings } from "./scrape-npb";
function fixture(league: "central" | "pacific", final = true, year = 2026) {
  return `<title>${year}年度 ${league === "central" ? "セントラル" : "パシフィック"}・リーグ チーム勝敗表</title>${final ? '<p class="right">全日程終了</p>' : ''}<h4>チーム勝敗表</h4><table>${NPB_TEAMS.filter((t) => t.league === league).map((team) => `<tr><td>${team.name}</td><td>143</td><td>70</td><td>70</td><td>3</td></tr>`).join('')}</table>`;
}
afterEach(() => vi.unstubAllGlobals());
describe("official season completion", () => {
  it("reads six distinct teams and explicit completion from the requested season", () => {
    const rows = parseOfficialStandings(fixture("central"), 2026, "central");
    expect(rows).toHaveLength(6); expect(rows[0]).toMatchObject({ rank: 1, wins: 70, losses: 70, draws: 3, isFinal: true });
    expect(parseOfficialStandings(fixture("central", false), 2026, "central").every((row) => row.isFinal === false)).toBe(true);
  });
  it("rejects another season, league, incomplete teams and corrupt game counts", () => {
    expect(() => parseOfficialStandings(fixture("central", true, 2025), 2026, "central")).toThrow();
    expect(() => parseOfficialStandings(fixture("central"), 2026, "pacific")).toThrow();
    expect(() => parseOfficialStandings(fixture("central").replace('中日ドラゴンズ','不明'), 2026, "central")).toThrow();
    expect(() => parseOfficialStandings(fixture("central").replace('<td>143</td>', '<td>142</td>'), 2026, "central")).toThrow();
  });
  it("calls only the year-bound official endpoints and returns both leagues", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url === 'https://npb.jp/bis/2026/stats/std_c.html') return new Response(fixture("central"));
      if (url === 'https://npb.jp/bis/2026/stats/std_p.html') return new Response(fixture("pacific"));
      throw new Error("Unexpected external request");
    }));
    expect(await scrapeNpbStandings(2026)).toHaveLength(12);expect(calls).toHaveLength(2);
  });
});
