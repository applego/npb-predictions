import { describe, expect, it } from "vitest";
import { needsScrapeAttention } from "../scrape-health";

const NOW = new Date("2026-06-08T04:55:00.000Z");

function status(overrides: Partial<Parameters<typeof needsScrapeAttention>[0]>) {
  return {
    source: "yahoo-games:2026-06-08",
    unresolvedCount: 3,
    latestError: "Error",
    latestAt: "2026-06-08T04:30:00.000Z",
    latestHtmlSnippet: null,
    latestHttpStatus: null,
    ...overrides,
  };
}

describe("needsScrapeAttention", () => {
  it("alerts on repeated recent unresolved failures", () => {
    expect(needsScrapeAttention(status({}), NOW)).toBe(true);
  });

  it("ignores one-off failures", () => {
    expect(needsScrapeAttention(status({ unresolvedCount: 2 }), NOW)).toBe(false);
  });

  it("ignores stale unresolved historical failures", () => {
    expect(
      needsScrapeAttention(status({ latestAt: "2026-06-07T14:14:36.000Z" }), NOW),
    ).toBe(false);
  });

  it("ignores malformed timestamps", () => {
    expect(needsScrapeAttention(status({ latestAt: "not-a-date" }), NOW)).toBe(false);
  });
});
