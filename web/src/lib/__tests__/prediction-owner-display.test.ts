import { describe, expect, it } from "vitest";
import {
  formatActiveYears,
  formatPredictionOwnerSubline,
} from "../prediction-owner-display";

describe("prediction owner display helpers", () => {
  it("formats contiguous active years as a range", () => {
    expect(formatActiveYears([2026, 2024, 2025])).toBe("2024-2026年");
  });

  it("formats non-contiguous active years explicitly", () => {
    expect(formatActiveYears([2026, 2024])).toBe("2024/2026年");
  });

  it("includes source, variant, and active years to disambiguate duplicate commentator names", () => {
    expect(
      formatPredictionOwnerSubline({
        source: "スポニチ",
        variant: "予想2",
        activeYears: [2024, 2026],
      }),
    ).toBe("スポニチ / 予想2 / 2024/2026年");
  });

  it("falls back to slug when duplicate names have no metadata", () => {
    expect(
      formatPredictionOwnerSubline({
        slug: "shinozuka-kazunori-2024",
        includeSlugFallback: true,
      }),
    ).toBe("shinozuka-kazunori-2024");
  });

  it("keeps the slug fallback when active years alone cannot identify duplicate names", () => {
    expect(
      formatPredictionOwnerSubline({
        activeYears: [2026],
        slug: "shinozuka-kazunori-2026-alt",
        includeSlugFallback: true,
      }),
    ).toBe("2026年 / shinozuka-kazunori-2026-alt");
  });
});
