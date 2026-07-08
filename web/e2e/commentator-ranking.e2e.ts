import { test, expect } from "@playwright/test";

// Verify /rankings/commentators shows commentator entries with scores.

async function waitForCommentatorRanking(page: import("@playwright/test").Page) {
  await expect(page.getByText(/人表示/)).toBeVisible();
}

test.describe("Commentator ranking", () => {
  test("/rankings/commentators loads and shows ranking rows", async ({ page }) => {
    const res = await page.goto("/rankings/commentators");
    expect(res?.status(), "/rankings/commentators must not 5xx").toBeLessThan(500);
    await waitForCommentatorRanking(page);

    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Internal Server Error");

    // Page should render meaningful content
    expect((body?.length ?? 0)).toBeGreaterThan(500);
    expect(body).toMatch(/解説者|評論家|commentator|ランキング|的中率|位/i);
  });

  test("/rankings/commentators has at least one numeric rank or score", async ({
    page,
  }) => {
    await page.goto("/rankings/commentators");
    await waitForCommentatorRanking(page);
    const body = (await page.textContent("body")) ?? "";
    // A ranking page must show at least one rank indicator (1位 / #1 / 1st) OR a score (+12 / -5)
    const hasRankIndicator = /(?:^|\s)(?:\d+\s*位|#\d+|No\.\s*\d+)/.test(body);
    const hasScore = /[+\-]\d+/.test(body);
    expect(
      hasRankIndicator || hasScore,
      "ranking page should expose rank or score numerics",
    ).toBe(true);
  });

  test("/rankings/commentators/[slug] loads a detail page for the top commentator", async ({
    page,
    request,
  }) => {
    // Try to resolve a real slug via the listing page, fall back to a known id-1 slug.
    await page.goto("/rankings/commentators");
    await waitForCommentatorRanking(page);
    const firstLink = page.locator('a[href*="/rankings/commentators/"]').first();
    const count = await firstLink.count();
    expect(count, "ranking page must expose at least one commentator detail link").toBeGreaterThan(0);
    const href = (await firstLink.getAttribute("href")) ?? "";
    expect(href).toBeTruthy();

    const detailRes = await request.get(href);
    expect(detailRes.status(), `${href} must not 5xx`).toBeLessThan(500);
  });

  test("friend seed users are not exposed through commentator detail API", async ({
    request,
  }) => {
    const res = await request.get("/api/commentators/tsuneshige?year=2026");
    expect(res.status()).toBe(404);
  });
});
