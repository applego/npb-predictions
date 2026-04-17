import { describe, it, expect } from "vitest";
import { parseYahooStandings } from "../scrape-yahoo";

// Minimal HTML fixture mimicking Yahoo! Sports standings table shape.
// Real DOM has more noise but parseYahooStandings uses regex so this is safe.
const fixture = (rows: [number, string, number, number, number, number][]) => `
<html><body>
<table class="bb-rankTable">
  <thead><tr><th>順位</th><th>チーム</th><th>試合</th><th>勝</th><th>負</th><th>引</th></tr></thead>
  <tbody>
    ${rows
      .map(
        ([rank, name, games, w, l, d]) =>
          `<tr><td>${rank}</td><td><a href="/npb/teams/">${name}</a></td><td>${games}</td><td>${w}</td><td>${l}</td><td>${d}</td></tr>`,
      )
      .join("\n")}
  </tbody>
</table>
</body></html>
`;

describe("parseYahooStandings", () => {
  it("parses a central league table into 6 rows", () => {
    const html = fixture([
      [1, "阪神", 143, 85, 53, 5],
      [2, "広島", 143, 74, 65, 4],
      [3, "DeNA", 143, 74, 66, 3],
      [4, "巨人", 143, 71, 70, 2],
      [5, "ヤクルト", 143, 57, 83, 3],
      [6, "中日", 143, 56, 82, 5],
    ]);
    const result = parseYahooStandings(html, "central");
    expect(result.length).toBe(6);
    expect(result[0]).toEqual({
      league: "central",
      rank: 1,
      teamName: "阪神タイガース",
      wins: 85,
      losses: 53,
      draws: 5,
    });
    expect(result[5].teamName).toBe("中日ドラゴンズ");
  });

  it("skips teams from the wrong league", () => {
    const html = fixture([
      [1, "阪神", 143, 85, 53, 5], // central
      [2, "ソフトバンク", 143, 80, 60, 3], // pacific — should be filtered
    ]);
    const result = parseYahooStandings(html, "central");
    expect(result.length).toBe(1);
    expect(result[0].teamName).toBe("阪神タイガース");
  });

  it("returns empty array when no table matches", () => {
    const result = parseYahooStandings("<html><body>No data</body></html>", "central");
    expect(result).toEqual([]);
  });

  it("tolerates rank > 6 as invalid (keeps within expected range)", () => {
    const html = fixture([
      [1, "阪神", 143, 85, 53, 5],
      [99, "知らないチーム", 143, 10, 10, 0],
    ]);
    const result = parseYahooStandings(html, "central");
    expect(result.length).toBe(1);
  });
});
