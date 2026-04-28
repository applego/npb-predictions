import { test, expect } from "@playwright/test";

// Verify /news actually renders a populated, recent news feed.
//
// Previously this test silently passed when:
//   - the page rendered an empty-state ("記事がありません")
//   - the body merely contained one of several common keywords (no real items)
//   - articles were stale (the feed had crashed weeks ago)
//
// The hardened version requires that:
//   - no error chrome (Application error / Internal Server Error / h1=Error) is rendered
//   - at least 3 news items (data-testid="news-item") are mounted in the DOM
//   - the body contains both meaningful length AND a domain keyword
//   - the feed reflects activity from the current or previous season — not a
//     years-stale snapshot. NewsItem currently exposes `year` rather than a
//     full date, so we assert recency at the season-year granularity, which is
//     the strictest signal the data shape supports.

const SEASON_RECENCY_TOLERANCE = 1; // accept current year and previous year

test.describe("News feed", () => {
  test("/news renders ≥3 real items, no error chrome, and current-season activity", async ({
    page,
  }) => {
    const res = await page.goto("/news");
    expect(res?.status(), "/news must not 5xx").toBeLessThan(500);
    await page.waitForLoadState("networkidle");

    // Hard fail if a Next.js error boundary / generic error page is rendered.
    const errorHeadings = await page
      .locator(
        "h1:has-text('Application error'), h1:has-text('Internal Server Error'), h1:text-is('Error')",
      )
      .count();
    expect(errorHeadings, "/news must not render an error heading").toBe(0);

    const body = (await page.textContent("body")) ?? "";
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Internal Server Error");

    // The empty-state component is intentional but is NOT acceptable for E2E:
    // a healthy seeded environment must always have at least a few items.
    const emptyState = page.getByTestId("news-empty-state");
    expect(
      await emptyState.count(),
      "news feed rendered empty-state ('記事がありません') — generator returned 0 items",
    ).toBe(0);

    // Require AND-condition: body must be substantial AND contain a domain
    // keyword. Either alone would let an unrelated chrome-only page slip
    // through (e.g. a marketing splash, a partial render).
    const hasMinLength = body.length > 500;
    const hasKeyword = /(?:的中|予想|ランキング|解説者|新規|速報)/.test(body);
    expect(hasMinLength, "body should be >500 chars").toBe(true);
    expect(hasKeyword, "body should mention a news-domain keyword").toBe(true);

    // Require a non-trivial number of rendered items.
    const items = page.getByTestId("news-item");
    const itemCount = await items.count();
    expect(
      itemCount,
      `news feed should render ≥3 items, got ${itemCount}`,
    ).toBeGreaterThanOrEqual(3);
    await expect(items.first()).toBeVisible();

    // Recency: at least one item must reference the current season or last
    // season. NewsItem renders `year` via data-news-year; if the entire feed
    // is years stale, this assertion fails loudly instead of passing on a
    // body keyword that survives across years.
    const currentYear = new Date().getFullYear();
    const acceptableYears = new Set<string>();
    for (let y = currentYear - SEASON_RECENCY_TOLERANCE; y <= currentYear; y++) {
      acceptableYears.add(String(y));
    }
    const renderedYears = await items.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).dataset.newsYear ?? ""),
    );
    const recentCount = renderedYears.filter((y) => acceptableYears.has(y)).length;
    expect(
      recentCount,
      `at least one item should be from years ${[...acceptableYears].join("/")}, got years=${renderedYears.join(",")}`,
    ).toBeGreaterThanOrEqual(1);
  });

  test("/news SEO metadata is present and meaningful", async ({ page }) => {
    await page.goto("/news");
    await expect(page).toHaveTitle(/NEWS|ニュース/);
    const descr = await page.locator('meta[name="description"]').getAttribute("content");
    expect(descr, "description meta required").toBeTruthy();
    expect((descr ?? "").length).toBeGreaterThan(20);
  });
});
