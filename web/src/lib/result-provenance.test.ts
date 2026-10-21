import { describe, expect, it } from "vitest";
import { withPredictionSources } from "./result-provenance";
import type { PublicResultPick } from "./season-results";
const teams = ["阪神", "巨人", "DeNA", "広島", "中日", "ヤクルト"];
const picks: PublicResultPick[] = teams.map((teamName, index) => ({ predictionId: 1, userId: 1, name: "篠塚和典", slug: "test", variant: null, source: "週刊ベースボール 2023年4/3号", sourceUrl: "https://example.com/old", league: "central", createdAt: "2026-03-01", rank: index + 1, teamName }));
describe("prediction provenance", () => {
  it("uses the selected year's exact six-team prediction instead of a person's old profile source", () => {
    const result = withPredictionSources(picks, 2026, "central");
    expect(result[0].source).toBe("web Sportiva（3/27）");
    expect(result[0].sourceUrl).toBeNull();
    expect(result.map((row) => row.teamName)).toEqual(teams);
  });
  it("does not attribute a different year, league, variant or ranking", () => {
    for (const changed of [picks.map((row) => ({ ...row, variant: "別番組" })), picks.map((row) => ({ ...row, rank: 7 - row.rank })), picks.slice(1)]) {
      expect(withPredictionSources(changed, 2026, "central")[0].source).toBeNull();
    }
    expect(withPredictionSources(picks, 2030, "central")[0].source).toBeNull();
    expect(withPredictionSources(picks, 2026, "pacific")[0].source).toBeNull();
  });
  it("does not invent a publication year from a month/day", () => {
    const catalog = { "2026": { central: [{ name: "篠塚和典", variant: null, rankings: teams, source: "新聞", date: "12/30" }] } };
    expect(withPredictionSources(picks, 2026, "central", catalog)[0].source).toBe("新聞（12/30）");
  });
  it("keeps missing league provenance explicit in a combined card", () => {
    expect(withPredictionSources(picks, 2026, "all")[0].source).toBe("セ：web Sportiva（3/27） ／ パ：当年出典未確認");
  });
});
