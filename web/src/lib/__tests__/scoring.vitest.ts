import { describe, it, expect } from "vitest";
import {
  calcRankingPointForTeam,
  calcRankingScore,
  calcTitleScore,
  calcUserScore,
  calcMonthlyChampions,
  type RankingPick,
  type TitlePick,
  type ActualStanding,
  type ActualTitle,
} from "../scoring";

describe("calcRankingPointForTeam", () => {
  it("returns +5 for exact match (diff=0)", () => {
    expect(calcRankingPointForTeam(1, 1)).toBe(5);
  });

  it("returns +3 for diff=1", () => {
    expect(calcRankingPointForTeam(1, 2)).toBe(3);
    expect(calcRankingPointForTeam(3, 2)).toBe(3);
  });

  it("returns +1 for diff=2", () => {
    expect(calcRankingPointForTeam(1, 3)).toBe(1);
  });

  it("returns -1 for diff=3", () => {
    expect(calcRankingPointForTeam(1, 4)).toBe(-1);
  });

  it("returns -3 for diff=4", () => {
    expect(calcRankingPointForTeam(1, 5)).toBe(-3);
  });

  it("returns -5 for diff=5", () => {
    expect(calcRankingPointForTeam(1, 6)).toBe(-5);
  });

  it("caps at -5 for diff > 5", () => {
    expect(calcRankingPointForTeam(1, 100)).toBe(-5);
  });
});

describe("calcRankingScore", () => {
  const actuals: ActualStanding[] = [
    { league: "central", rank: 1, teamName: "巨人" },
    { league: "central", rank: 2, teamName: "阪神" },
    { league: "central", rank: 3, teamName: "DeNA" },
    { league: "central", rank: 4, teamName: "広島" },
    { league: "central", rank: 5, teamName: "中日" },
    { league: "central", rank: 6, teamName: "ヤクルト" },
    { league: "pacific", rank: 1, teamName: "オリックス" },
    { league: "pacific", rank: 2, teamName: "ソフトバンク" },
    { league: "pacific", rank: 3, teamName: "ロッテ" },
    { league: "pacific", rank: 4, teamName: "楽天" },
    { league: "pacific", rank: 5, teamName: "西武" },
    { league: "pacific", rank: 6, teamName: "日本ハム" },
  ];

  it("perfect prediction yields max score (5 * 12 = 60)", () => {
    const picks: RankingPick[] = actuals.map((a) => ({
      league: a.league,
      rank: a.rank,
      teamName: a.teamName,
    }));
    const { score, details } = calcRankingScore(picks, actuals);
    expect(score).toBe(60);
    expect(details).toHaveLength(12);
    expect(details.every((d) => d.diff === 0 && d.score === 5)).toBe(true);
  });

  it("all wrong by 1 yields 3 * 12 = 36", () => {
    // Shift central by 1 position
    const picks: RankingPick[] = [
      { league: "central", rank: 2, teamName: "巨人" },
      { league: "central", rank: 3, teamName: "阪神" },
      { league: "central", rank: 4, teamName: "DeNA" },
      { league: "central", rank: 5, teamName: "広島" },
      { league: "central", rank: 6, teamName: "中日" },
      { league: "central", rank: 1, teamName: "ヤクルト" },
      { league: "pacific", rank: 2, teamName: "オリックス" },
      { league: "pacific", rank: 3, teamName: "ソフトバンク" },
      { league: "pacific", rank: 4, teamName: "ロッテ" },
      { league: "pacific", rank: 5, teamName: "楽天" },
      { league: "pacific", rank: 6, teamName: "西武" },
      { league: "pacific", rank: 1, teamName: "日本ハム" },
    ];
    const { score } = calcRankingScore(picks, actuals);
    // ヤクルト: |1-6|=5 → -5, 日本ハム: |1-6|=5 → -5
    // Others are all diff=1 → +3 each = 10 * 3 = 30
    expect(score).toBe(30 - 5 - 5); // 20
  });

  it("skips teams not in actuals", () => {
    const picks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "不明チーム" },
    ];
    const { score, details } = calcRankingScore(picks, actuals);
    expect(score).toBe(0);
    expect(details).toHaveLength(0);
  });
});

describe("calcTitleScore", () => {
  const actuals: ActualTitle[] = [
    {
      league: "central",
      category: "batting_avg",
      playerName: "牧 秀悟",
    },
    {
      league: "central",
      category: "home_runs",
      playerName: "岡本 和真",
    },
    {
      league: "pacific",
      category: "era",
      playerName: "山本 由伸",
    },
  ];

  it("gives +3 per correct pick", () => {
    const picks: TitlePick[] = [
      {
        league: "central",
        category: "batting_avg",
        playerName: "牧 秀悟",
      },
      {
        league: "central",
        category: "home_runs",
        playerName: "岡本 和真",
      },
    ];
    const { score, details } = calcTitleScore(picks, actuals);
    expect(score).toBe(6);
    expect(details.filter((d) => d.hit)).toHaveLength(2);
  });

  it("0 for wrong pick", () => {
    const picks: TitlePick[] = [
      {
        league: "central",
        category: "batting_avg",
        playerName: "村上 宗隆",
      },
    ];
    const { score, details } = calcTitleScore(picks, actuals);
    expect(score).toBe(0);
    expect(details[0].hit).toBe(false);
  });

  it("is case-insensitive and trims whitespace", () => {
    const picks: TitlePick[] = [
      {
        league: "pacific",
        category: "era",
        playerName: " 山本 由伸 ",
      },
    ];
    const { score } = calcTitleScore(picks, actuals);
    expect(score).toBe(3);
  });

  it("skips categories not in actuals", () => {
    const picks: TitlePick[] = [
      { league: "central", category: "saves", playerName: "誰か" },
    ];
    const { score, details } = calcTitleScore(picks, actuals);
    expect(score).toBe(0);
    expect(details).toHaveLength(0);
  });
});

describe("calcUserScore", () => {
  it("combines ranking + title scores", () => {
    const rankingPicks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "巨人" },
    ];
    const titlePicks: TitlePick[] = [
      {
        league: "central",
        category: "batting_avg",
        playerName: "牧",
      },
    ];
    const actStandings: ActualStanding[] = [
      { league: "central", rank: 1, teamName: "巨人" },
    ];
    const actTitles: ActualTitle[] = [
      { league: "central", category: "batting_avg", playerName: "牧" },
    ];
    const result = calcUserScore(
      1,
      rankingPicks,
      titlePicks,
      actStandings,
      actTitles
    );
    expect(result.rankingScore).toBe(5);
    expect(result.titleScore).toBe(3);
    expect(result.totalScore).toBe(8);
    expect(result.userId).toBe(1);
  });
});

describe("calcMonthlyChampions", () => {
  it("picks user with highest gain per month", () => {
    const snapshots = [
      // Month 3 (March)
      { userId: 1, totalScore: 10, snapshotDate: new Date("2026-03-31") },
      { userId: 2, totalScore: 15, snapshotDate: new Date("2026-03-31") },
      // Month 4 (April)
      { userId: 1, totalScore: 30, snapshotDate: new Date("2026-04-30") },
      { userId: 2, totalScore: 20, snapshotDate: new Date("2026-04-30") },
    ];
    const results = calcMonthlyChampions(snapshots);
    // March: user1 gain=10-0=10, user2 gain=15-0=15 → user2 wins
    // April: user1 gain=30-10=20, user2 gain=20-15=5 → user1 wins
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ month: 3, userId: 2, scoreGain: 15 });
    expect(results[1]).toEqual({ month: 4, userId: 1, scoreGain: 20 });
  });

  it("returns empty for no snapshots", () => {
    expect(calcMonthlyChampions([])).toEqual([]);
  });

  it("handles single month", () => {
    const snapshots = [
      { userId: 1, totalScore: 5, snapshotDate: new Date("2026-04-15") },
    ];
    const results = calcMonthlyChampions(snapshots);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ month: 4, userId: 1, scoreGain: 5 });
  });
});
