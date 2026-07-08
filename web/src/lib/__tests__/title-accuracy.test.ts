import { describe, expect, it } from "vitest";
import { scoreTitlePredictors } from "../title-accuracy";

describe("scoreTitlePredictors", () => {
  it("excludes predictors with no title picks from the title leaderboard", () => {
    const actualByKey = new Map([
      ["central:batting_avg", { playerName: "近本 光司" }],
      ["central:rbi", { playerName: "佐藤 輝明" }],
    ]);
    const predictors = scoreTitlePredictors(
      [
        {
          predictionId: 1,
          name: "大矢",
          source: null,
          picks: new Map([
            ["central:batting_avg", { playerName: "近本 光司" }],
          ]),
        },
        {
          predictionId: 2,
          name: "未予想",
          source: null,
          picks: new Map(),
        },
      ],
      actualByKey,
      ["central:batting_avg", "central:rbi"],
    );

    expect(predictors).toHaveLength(1);
    expect(predictors[0]).toMatchObject({
      name: "大矢",
      hits: 1,
      confirmedTitleCount: 2,
      score: 3,
    });
  });

  it("keeps partial submissions on the confirmed-title denominator", () => {
    const predictors = scoreTitlePredictors(
      [
        {
          predictionId: 1,
          name: "部分予想",
          source: null,
          picks: new Map([["central:batting_avg", { playerName: "近本 光司" }]]),
        },
      ],
      new Map([
        ["central:batting_avg", { playerName: "近本 光司" }],
        ["central:rbi", { playerName: "佐藤 輝明" }],
      ]),
      ["central:batting_avg", "central:rbi"],
    );

    expect(predictors[0]).toMatchObject({
      hits: 1,
      confirmedTitleCount: 2,
    });
  });
});
