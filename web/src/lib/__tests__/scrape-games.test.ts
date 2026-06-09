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

const currentYahooFinalGame = `
<li class="bb-score__item">
  <a class="bb-score__content" href="/npb/game/2021038978/index">
    <p class="bb-score__description"><span class="bb-score__venue">バンテリンドーム</span></p>
    <div class="bb-score__team">
      <p class="bb-score__homeLogo bb-score__homeLogo--npbTeam4">中日</p>
      <p class="bb-score__awayLogo bb-score__awayLogo--npbTeam7">西武</p>
    </div>
    <div class="bb-score__detail">
      <p class="bb-score__status">
        <span class="bb-score__score bb-score__score--left">1</span>
        <span class="bb-score__score bb-score__score--center">-</span>
        <span class="bb-score__score bb-score__score--right">4</span>
      </p>
      <p class="bb-score__link">試合終了</p>
    </div>
  </a>
</li>
`;

const currentYahooScheduledGame = `
<li class="bb-score__item">
  <a class="bb-score__content" href="/npb/game/2021044693/index">
    <p class="bb-score__description"><span class="bb-score__venue">甲子園</span></p>
    <div class="bb-score__team">
      <p class="bb-score__homeLogo bb-score__homeLogo--npbTeam5">阪神</p>
      <p class="bb-score__awayLogo bb-score__awayLogo--npbTeam376">楽天</p>
    </div>
    <div class="bb-score__detail">
      <time class="bb-score__status">18:00</time>
      <p class="bb-score__link">見どころ</p>
    </div>
  </a>
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

  it("parses current Yahoo final-game markup", () => {
    const games = parseYahooSchedule(fixture(currentYahooFinalGame), "2026-06-07");
    expect(games[0]).toMatchObject({
      gameDate: "2026-06-07",
      league: "interleague",
      homeTeam: "中日ドラゴンズ",
      awayTeam: "埼玉西武ライオンズ",
      homeScore: 1,
      awayScore: 4,
      status: "final",
      winner: "away",
      stadium: "バンテリンドーム",
    });
  });

  it("parses current Yahoo scheduled-game markup", () => {
    const games = parseYahooSchedule(fixture(currentYahooScheduledGame), "2026-06-08");
    expect(games[0]).toMatchObject({
      gameDate: "2026-06-08",
      league: "interleague",
      homeTeam: "阪神タイガース",
      awayTeam: "東北楽天ゴールデンイーグルス",
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      winner: null,
      stadium: "甲子園",
    });
  });

  it("returns empty when no matching blocks", () => {
    const games = parseYahooSchedule("<html><body>nothing here</body></html>", "2026-04-19");
    expect(games).toEqual([]);
  });
});
