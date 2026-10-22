import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getDb: vi.fn(), env: {} as { PUBLIC_RESULTS_ARCHIVE?: string } }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("@cloudflare/next-on-pages", () => ({ getRequestContext: () => ({ env: mocks.env }) }));
import { loadSeasonResults } from "./season-results-data";
import { publishedSeasonResults } from "./public-results-archive";
beforeEach(() => { mocks.env = {}; mocks.getDb.mockReset().mockImplementation(() => { throw new Error("D1 daily row read limit exceeded"); }); });
describe("published season review", () => {
  it("serves both final leagues without opening the unavailable database", async () => {
    for (const scope of ["central", "pacific", "all"] as const) {
      const data = await loadSeasonResults(2026, scope);
      expect(data.error).toBeNull();
      expect(data.summary.status).toBe("final");
      expect(data.summary.entries.length).toBeGreaterThan(200);
      expect(data.summary.entries[0].details).toHaveLength(scope === "all" ? 12 : 6);
    }
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("preserves public commentator links and matching annual provenance", () => {
    const data = publishedSeasonResults(2026, "central")!;
    const entry = data.summary.entries.find((row) => row.userId === 90)!;
    expect(entry.name).toBe("篠塚和典"); expect(entry.source).toBe("web Sportiva（3/27）");
    expect(entry.populationLabel).toBe("公開保存分内");
    expect(data.coverage).toMatchObject({ central: 270, pacific: 209 });
    expect(data.coverage?.selectionEvidence).toBeUndefined();
    expect(entry.exact).toBe(4);expect(entry.deviation).toBe(2);
    expect(data.summary.snapshots[0].rows.map((row) => row.rank)).toEqual([1,2,3,4,5,6]);
    expect(publishedSeasonResults(2025, "central")).toBeNull();
  });
  it("keeps fixture and unfinished seasons on the live data path", async () => {
    mocks.env.PUBLIC_RESULTS_ARCHIVE = "0";
    expect((await loadSeasonResults(2026, "central")).error).toBe("unavailable");
    mocks.env = {};
    expect((await loadSeasonResults(2027, "central")).error).toBe("unavailable");
    expect(mocks.getDb).toHaveBeenCalledTimes(2);
  });
});
