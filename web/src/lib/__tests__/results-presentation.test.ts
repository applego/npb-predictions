import { describe, expect, it } from "vitest";
import { groupIdenticalResults } from "../results-presentation";
import type { ResultEntry } from "../season-results";

const entry: ResultEntry = { userId: 1, predictionId: 1, name: "検証用 解説者", slug: "fixture", source: "検証番組", sourceUrl: null, variant: null, rank: 1, exact: 1, deviation: 0, details: [{ league: "central", teamName: "阪神タイガース", predictedRank: 1, actualRank: 1, difference: 0 }] };

describe("identical result registrations", () => {
  it("keeps the original score, order and share aliases while collapsing identical content", () => {
    const copy = { ...entry, userId: 2, predictionId: 2, slug: "fixture-copy" };
    const input = [entry, copy];
    expect(groupIdenticalResults(input)).toEqual([{ entry, aliases: [2] }]);
    expect(input).toHaveLength(2); expect(entry.rank).toBe(1);
  });
  it.each([
    { name: "別の解説者" }, { source: "別番組" }, { sourceUrl: "https://example.com/other" },
    { variant: "other" }, { rank: 2 },
    { details: [{ ...entry.details[0], predictedRank: 2, difference: 1 }] },
  ])("never merges different names, sources, variants, scores or forecasts: %o", difference => {
    const other = { ...entry, ...difference, userId: 2 };
    expect(groupIdenticalResults([entry, other])).toHaveLength(2);
  });
});
