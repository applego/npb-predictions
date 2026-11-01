import { describe, expect, it } from "vitest";
import { trendPage } from "../trend-page";

describe("trendPage", () => {
  it("splits 411 rows into 9 pages of at most 50", () => {
    expect(trendPage(undefined, 411)).toEqual({ page: 1, pages: 9, start: 0, end: 50 });
    expect(trendPage("9", 411)).toEqual({ page: 9, pages: 9, start: 400, end: 411 });
  });

  it("clamps malformed and out-of-range pages", () => {
    expect(trendPage("0", 411).page).toBe(1);
    expect(trendPage("abc", 411).page).toBe(1);
    expect(trendPage("99", 411)).toMatchObject({ page: 9, start: 400 });
  });

  it("keeps a single empty page when there are no rows", () => {
    expect(trendPage("3", 0)).toEqual({ page: 1, pages: 1, start: 0, end: 0 });
  });
});
