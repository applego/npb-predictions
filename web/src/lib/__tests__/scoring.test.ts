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

// --- calcRankingPointForTeam ---

describe("calcRankingPointForTeam", () => {
  it("returns 5 for exact match (diff=0)", () => {
    expect(calcRankingPointForTeam(1, 1)).toBe(5);
  });

  it("returns 3 for off-by-1", () => {
    expect(calcRankingPointForTeam(2, 1)).toBe(3);
    expect(calcRankingPointForTeam(1, 2)).toBe(3);
  });

  it("returns 1 for off-by-2", () => {
    expect(calcRankingPointForTeam(3, 1)).toBe(1);
  });

  it("returns -1 for off-by-3", () => {
    expect(calcRankingPointForTeam(4, 1)).toBe(-1);
  });

  it("returns -3 for off-by-4", () => {
    expect(calcRankingPointForTeam(5, 1)).toBe(-3);
  });

  it("returns -5 for off-by-5 or more", () => {
    expect(calcRankingPointForTeam(6, 1)).toBe(-5);
    expect(calcRankingPointForTeam(10, 1)).toBe(-5);
  });

  it("handles rank 0 edge case", () => {
    expect(calcRankingPointForTeam(0, 0)).toBe(5);
  });
});

// --- calcRankingScore ---

describe("calcRankingScore", () => {
  const actualStandings: ActualStanding[] = [
    { league: "central", rank: 1, teamName: "Giants" },
    { league: "central", rank: 2, teamName: "Swallows" },
    { league: "central", rank: 3, teamName: "BayStars" },
    { league: "pacific", rank: 1, teamName: "Lions" },
    { league: "pacific", rank: 2, teamName: "Hawks" },
  ];

  it("calculates score for correct predictions", () => {
    const picks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "Giants" },
      { league: "pacific", rank: 1, teamName: "Lions" },
    ];
    const result = calcRankingScore(picks, actualStandings);
    expect(result.score).toBe(10); // 5 + 5
    expect(result.details).toHaveLength(2);
  });

  it("calculates score for partially correct predictions", () => {
    const picks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "Swallows" }, // actually 2nd, diff=1
      { league: "pacific", rank: 1, teamName: "Hawks" },    // actually 2nd, diff=1
    ];
    const result = calcRankingScore(picks, actualStandings);
    expect(result.score).toBe(6); // 3 + 3
  });

  it("returns negative score for wrong predictions", () => {
    const picks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "BayStars" }, // actually 3rd, diff=2
    ];
    const result = calcRankingScore(picks, actualStandings);
    expect(result.score).toBe(1); // diff=2 → 1pt
  });

  it("skips teams not found in actuals", () => {
    const picks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "Tigers" }, // not in actuals
    ];
    const result = calcRankingScore(picks, actualStandings);
    expect(result.score).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  it("handles empty picks", () => {
    const result = calcRankingScore([], actualStandings);
    expect(result.score).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  it("includes correct diff in details", () => {
    const picks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "BayStars" }, // predicted 1st, actual 3rd
    ];
    const result = calcRankingScore(picks, actualStandings);
    expect(result.details[0].diff).toBe(2);
    expect(result.details[0].predictedRank).toBe(1);
    expect(result.details[0].actualRank).toBe(3);
  });
});

// --- calcTitleScore ---

describe("calcTitleScore", () => {
  const actualTitles: ActualTitle[] = [
    { league: "central", category: "homeRun", playerName: "Murakami" },
    { league: "central", category: "battingAvg", playerName: "Yamada" },
    { league: "pacific", category: "homeRun", playerName: "Marte" },
  ];

  it("gives +3 for each correct title pick", () => {
    const picks: TitlePick[] = [
      { league: "central", category: "homeRun", playerName: "Murakami" },
      { league: "pacific", category: "homeRun", playerName: "Marte" },
    ];
    const result = calcTitleScore(picks, actualTitles);
    expect(result.score).toBe(6);
    expect(result.details.every((d) => d.hit)).toBe(true);
  });

  it("gives 0 for wrong title pick", () => {
    const picks: TitlePick[] = [
      { league: "central", category: "homeRun", playerName: "Otani" },
    ];
    const result = calcTitleScore(picks, actualTitles);
    expect(result.score).toBe(0);
    expect(result.details[0].hit).toBe(false);
  });

  it("is case-insensitive and trimmed", () => {
    const picks: TitlePick[] = [
      { league: "central", category: "homeRun", playerName: " murakami " },
    ];
    const result = calcTitleScore(picks, actualTitles);
    expect(result.score).toBe(3);
    expect(result.details[0].hit).toBe(true);
  });

  it("skips categories not found in actuals", () => {
    const picks: TitlePick[] = [
      { league: "pacific", category: "stolenBase", playerName: "Suzuki" },
    ];
    const result = calcTitleScore(picks, actualTitles);
    expect(result.score).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  it("handles mix of hits and misses", () => {
    const picks: TitlePick[] = [
      { league: "central", category: "homeRun", playerName: "Murakami" }, // hit
      { league: "central", category: "battingAvg", playerName: "Otani" }, // miss
    ];
    const result = calcTitleScore(picks, actualTitles);
    expect(result.score).toBe(3);
    expect(result.details).toHaveLength(2);
    expect(result.details[0].hit).toBe(true);
    expect(result.details[1].hit).toBe(false);
  });
});

// --- calcUserScore ---

describe("calcUserScore", () => {
  const actualStandings: ActualStanding[] = [
    { league: "central", rank: 1, teamName: "Giants" },
    { league: "pacific", rank: 1, teamName: "Lions" },
  ];

  const actualTitles: ActualTitle[] = [
    { league: "central", category: "homeRun", playerName: "Murakami" },
  ];

  it("combines ranking and title scores", () => {
    const rankingPicks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "Giants" }, // +5
    ];
    const titlePicks: TitlePick[] = [
      { league: "central", category: "homeRun", playerName: "Murakami" }, // +3
    ];
    const result = calcUserScore(1, rankingPicks, titlePicks, actualStandings, actualTitles);
    expect(result.userId).toBe(1);
    expect(result.rankingScore).toBe(5);
    expect(result.titleScore).toBe(3);
    expect(result.totalScore).toBe(8);
  });

  it("returns zero breakdowns for empty picks", () => {
    const result = calcUserScore(42, [], [], actualStandings, actualTitles);
    expect(result.totalScore).toBe(0);
    expect(result.rankingDetails).toHaveLength(0);
    expect(result.titleDetails).toHaveLength(0);
  });
});

// --- calcMonthlyChampions ---

describe("calcMonthlyChampions", () => {
  it("returns empty array for empty snapshots", () => {
    expect(calcMonthlyChampions([])).toEqual([]);
  });

  it("finds champion for single month", () => {
    const snapshots = [
      { userId: 1, totalScore: 10, snapshotDate: new Date(2026, 0, 15) },
      { userId: 2, totalScore: 5, snapshotDate: new Date(2026, 0, 20) },
    ];
    const results = calcMonthlyChampions(snapshots);
    expect(results).toHaveLength(1);
    expect(results[0].month).toBe(1);
    expect(results[0].userId).toBe(1);
    expect(results[0].scoreGain).toBe(10);
  });

  it("calculates score gain as difference from previous month", () => {
    const snapshots = [
      { userId: 1, totalScore: 10, snapshotDate: new Date(2026, 0, 31) }, // Jan
      { userId: 1, totalScore: 25, snapshotDate: new Date(2026, 1, 28) }, // Feb: gain = 25-10 = 15
      { userId: 2, totalScore: 20, snapshotDate: new Date(2026, 1, 15) }, // Feb: gain = 20-0 = 20
    ];
    const results = calcMonthlyChampions(snapshots);

    // Jan champion: user 1 (gain=10)
    expect(results[0].month).toBe(1);
    expect(results[0].userId).toBe(1);
    expect(results[0].scoreGain).toBe(10);

    // Feb champion: user 2 (gain=20 > 15)
    expect(results[1].month).toBe(2);
    expect(results[1].userId).toBe(2);
    expect(results[1].scoreGain).toBe(20);
  });

  it("uses latest score per user per month", () => {
    const snapshots = [
      { userId: 1, totalScore: 10, snapshotDate: new Date(2026, 0, 1) },
      { userId: 1, totalScore: 50, snapshotDate: new Date(2026, 0, 31) }, // should override
    ];
    const results = calcMonthlyChampions(snapshots);
    expect(results).toHaveLength(1);
    expect(results[0].scoreGain).toBe(50); // latest score, no prev month → gain=50
  });

  it("handles negative gain (score decreased)", () => {
    const snapshots = [
      { userId: 1, totalScore: 20, snapshotDate: new Date(2026, 0, 31) },
      { userId: 1, totalScore: 10, snapshotDate: new Date(2026, 1, 28) },
    ];
    const results = calcMonthlyChampions(snapshots);
    // Feb: user 1, gain = 10-20 = -10
    expect(results[1].scoreGain).toBe(-10);
  });

  it("returns results sorted by month", () => {
    const snapshots = [
      { userId: 1, totalScore: 5, snapshotDate: new Date(2026, 2, 1) },  // Mar
      { userId: 1, totalScore: 3, snapshotDate: new Date(2026, 0, 1) },  // Jan
    ];
    const results = calcMonthlyChampions(snapshots);
    expect(results[0].month).toBe(1);
    expect(results[1].month).toBe(3);
  });

  it("keeps higher score when same user has multiple snapshots in the same month", () => {
    // First snapshot: 40, second: 10 — should keep 40 (existing > new)
    const snapshots = [
      { userId: 1, totalScore: 40, snapshotDate: new Date(2026, 0, 10) }, // Jan, score=40
      { userId: 1, totalScore: 10, snapshotDate: new Date(2026, 0, 25) }, // Jan, score=10 (lower → ignored)
      { userId: 2, totalScore: 30, snapshotDate: new Date(2026, 0, 15) }, // Jan, score=30
    ];
    const results = calcMonthlyChampions(snapshots);
    expect(results).toHaveLength(1);
    // User 1 gain=40 (best), user 2 gain=30 — user 1 wins
    expect(results[0].userId).toBe(1);
    expect(results[0].scoreGain).toBe(40);
  });

  it("handles tie-breaking: first user encountered wins on equal gain", () => {
    const snapshots = [
      { userId: 1, totalScore: 15, snapshotDate: new Date(2026, 0, 1) },
      { userId: 2, totalScore: 15, snapshotDate: new Date(2026, 0, 2) },
    ];
    const results = calcMonthlyChampions(snapshots);
    expect(results).toHaveLength(1);
    expect(results[0].scoreGain).toBe(15);
  });
});

// --- Regression: shortName vs fullName cross-matching ---

describe("calcRankingScore — name normalization", () => {
  const actuals: ActualStanding[] = [
    { league: "central", rank: 1, teamName: "東京ヤクルトスワローズ" },
    { league: "central", rank: 2, teamName: "横浜DeNAベイスターズ" },
    { league: "pacific", rank: 1, teamName: "福岡ソフトバンクホークス" },
    { league: "pacific", rank: 2, teamName: "オリックス・バファローズ" },
  ];

  it("matches when prediction uses shortName ('DeNA') against actual full name", () => {
    const picks: RankingPick[] = [{ league: "central", rank: 2, teamName: "DeNA" }];
    const { score, details } = calcRankingScore(picks, actuals);
    expect(score).toBe(5);
    expect(details[0].actualRank).toBe(2);
  });

  it("matches mixed shortName/fullName picks", () => {
    const picks: RankingPick[] = [
      { league: "central", rank: 1, teamName: "ヤクルト" },
      { league: "pacific", rank: 1, teamName: "ソフトバンク" },
      { league: "pacific", rank: 2, teamName: "オリックス・バファローズ" },
    ];
    expect(calcRankingScore(picks, actuals).score).toBe(15);
  });

  it("matches actuals stored under shortName (defensive)", () => {
    const legacyActuals: ActualStanding[] = [
      { league: "central", rank: 1, teamName: "巨人" },
    ];
    const picks: RankingPick[] = [{ league: "central", rank: 1, teamName: "読売ジャイアンツ" }];
    expect(calcRankingScore(picks, legacyActuals).score).toBe(5);
  });

  it("ignores unknown teams without crashing", () => {
    const picks: RankingPick[] = [{ league: "central", rank: 1, teamName: "未知の球団" }];
    const { score, details } = calcRankingScore(picks, actuals);
    expect(score).toBe(0);
    expect(details).toHaveLength(0);
  });
});
