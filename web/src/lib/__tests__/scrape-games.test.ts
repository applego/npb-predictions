import { describe, it, expect } from "vitest";
import { parseYahooSchedule } from "../scrape-games";

const fixture = (blocks: string) => `
<html><body>
<ul>
${blocks}
</ul>
</body></html>
`;

const finalGame = `
<li class="bb-score bb-score--final">
  <div class="bb-score__awayName">巨人</div>
  <div class="bb-score__score"><span>3</span></div>
  <div class="bb-score__status">試合終了</div>
  <div class="bb-score__score"><span>5</span></div>
  <div class="bb-score__homeName">阪神</div>
  <div class="bb-score__stadium">甲子園</div>
</li>
`;

const scheduledGame = `
<li class="bb-score bb-score--scheduled">
  <div class="bb-score__awayName">ソフトバンク</div>
  <div class="bb-score__score"><span>-</span></div>
  <div class="bb-score__status">18:00</div>
  <div class="bb-score__score"><span>-</span></div>
  <div class="bb-score__homeName">日本ハム</div>
  <div class="bb-score__stadium">エスコン</div>
</li>
`;

const postponedGame = `
<li class="bb-score">
  <div class="bb-score__awayName">中日</div>
  <div class="bb-score__score"><span>-</span></div>
  <div class="bb-score__status">中止</div>
  <div class="bb-score__score"><span>-</span></div>
  <div class="bb-score__homeName">広島</div>
  <div class="bb-score__stadium">マツダ</div>
</li>
`;

describe("parseYahooSchedule", () => {
  it("parses a final game with winner", () => {
    const games = parseYahooSchedule(fixture(finalGame), "2026-04-19");
    expect(games.length).toBe(1);
    expect(games[0]).toMatchObject({
      gameDate: "2026-04-19",
      league: "central",
      awayTeam: "読売ジャイアンツ",
      homeTeam: "阪神タイガース",
      awayScore: 3,
      homeScore: 5,
      status: "final",
      winner: "home",
      stadium: "甲子園",
    });
  });

  it("parses a scheduled game with null scores", () => {
    const games = parseYahooSchedule(fixture(scheduledGame), "2026-04-19");
    expect(games.length).toBe(1);
    expect(games[0].status).toBe("scheduled");
    expect(games[0].awayScore).toBeNull();
    expect(games[0].homeScore).toBeNull();
    expect(games[0].winner).toBeNull();
  });

  it("marks postponed games correctly", () => {
    const games = parseYahooSchedule(fixture(postponedGame), "2026-04-19");
    expect(games[0].status).toBe("postponed");
    expect(games[0].winner).toBeNull();
  });

  it("classifies interleague games", () => {
    const html = fixture(`
<li class="bb-score">
  <div class="bb-score__awayName">巨人</div>
  <div class="bb-score__score"><span>2</span></div>
  <div class="bb-score__status">試合終了</div>
  <div class="bb-score__score"><span>2</span></div>
  <div class="bb-score__homeName">ソフトバンク</div>
  <div class="bb-score__stadium">東京ドーム</div>
</li>`);
    const games = parseYahooSchedule(html, "2026-06-01");
    expect(games[0].league).toBe("interleague");
    expect(games[0].winner).toBe("tie");
  });

  it("returns empty when no matching blocks", () => {
    const games = parseYahooSchedule("<html><body>nothing here</body></html>", "2026-04-19");
    expect(games).toEqual([]);
  });
});
