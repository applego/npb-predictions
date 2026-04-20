import { describe, it, expect } from "vitest";
import { parseNpbStats } from "../scrape-titles";

const battingFixture = `
<html><body>
<table>
  <tr><th>打率</th><th>(セ)</th></tr>
  <tr><th>順位</th><th>選手名</th><th>チーム</th><th>試合</th><th>打率</th></tr>
  <tr><td>1</td><td>佐藤輝明</td><td>神</td><td>120</td><td>.320</td></tr>
  <tr><td>2</td><td>村上宗隆</td><td>ヤ</td><td>115</td><td>.315</td></tr>
  <tr><td>3</td><td>岡本和真</td><td>巨</td><td>118</td><td>.310</td></tr>
</table>
<table>
  <tr><th>本塁打</th><th>(セ)</th></tr>
  <tr><th>順位</th><th>選手名</th><th>チーム</th><th>試合</th><th>本塁打</th></tr>
  <tr><td>1</td><td>村上宗隆</td><td>ヤ</td><td>115</td><td>35</td></tr>
  <tr><td>2</td><td>岡本和真</td><td>巨</td><td>118</td><td>30</td></tr>
</table>
</body></html>
`;

const pitchingFixture = `
<html><body>
<table>
  <tr><th>勝利</th><th>(パ)</th></tr>
  <tr><th>順位</th><th>選手名</th><th>チーム</th><th>試合</th><th>勝利</th></tr>
  <tr><td>1</td><td>山本由伸</td><td>オ</td><td>25</td><td>16</td></tr>
</table>
<table>
  <tr><th>防御率</th><th>(パ)</th></tr>
  <tr><th>順位</th><th>選手名</th><th>チーム</th><th>試合</th><th>防御率</th></tr>
  <tr><td>1</td><td>山本由伸</td><td>オ</td><td>25</td><td>1.68</td></tr>
</table>
</body></html>
`;

describe("parseNpbStats (batting)", () => {
  it("extracts 打率 top 3 with mapped team names", () => {
    const result = parseNpbStats(battingFixture, "central", "batting");
    const avg = result.filter((r) => r.category === "batting_avg");
    expect(avg.length).toBe(3);
    expect(avg[0]).toEqual({
      league: "central",
      category: "batting_avg",
      rank: 1,
      playerName: "佐藤輝明",
      teamName: "阪神タイガース",
      value: 0.32,
    });
    expect(avg[2].playerName).toBe("岡本和真");
  });

  it("extracts 本塁打 as home_runs category", () => {
    const result = parseNpbStats(battingFixture, "central", "batting");
    const hr = result.filter((r) => r.category === "home_runs");
    expect(hr.length).toBe(2);
    expect(hr[0].value).toBe(35);
    expect(hr[0].teamName).toBe("東京ヤクルトスワローズ");
  });
});

describe("parseNpbStats (pitching)", () => {
  it("extracts 勝利 as wins and 防御率 as era", () => {
    const result = parseNpbStats(pitchingFixture, "pacific", "pitching");
    const wins = result.find((r) => r.category === "wins");
    const era = result.find((r) => r.category === "era");
    expect(wins?.value).toBe(16);
    expect(era?.value).toBe(1.68);
    expect(wins?.teamName).toBe("オリックス・バファローズ");
  });
});

describe("parseNpbStats (edge cases)", () => {
  it("returns empty array when no matching table", () => {
    const result = parseNpbStats("<html><table><tr><td>other</td></tr></table></html>", "central", "batting");
    expect(result).toEqual([]);
  });

  it("skips rows where rank is not 1-3", () => {
    const html = `
<html><body>
<table>
  <tr><th>打率</th></tr>
  <tr><th>順位</th><th>選手名</th><th>チーム</th><th>試合</th><th>打率</th></tr>
  <tr><td>4</td><td>名前4</td><td>神</td><td>100</td><td>.300</td></tr>
  <tr><td>1</td><td>名前1</td><td>神</td><td>100</td><td>.330</td></tr>
</table>
</body></html>`;
    const result = parseNpbStats(html, "central", "batting");
    expect(result.length).toBe(1);
    expect(result[0].rank).toBe(1);
  });
});
