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
      attemptedConfirmedCount: 1,
      score: 3,
    });
  });
});
