import { test, expect } from "@playwright/test";

// Verify /rankings/commentators renders ranked commentator rows with numeric
// scores in descending order — and that detail navigation works.
//
// Previously this test silently passed when:
//   - the listing rendered no commentator links (test.skip)
//   - the body contained either rank notation OR a stray +/- digit anywhere
//     (the OR-of-regex was broad enough to match unrelated chrome)
// The hardened version requires actual `data-testid="commentator-row"` rows
// and verifies score order using the data-display-score attribute.

test.describe("Commentator ranking", () => {
  test("/rankings/commentators loads and shows ≥3 ranking rows", async ({ page }) => {
    const res = await page.goto("/rankings/commentators");
    expect(res?.status(), "/rankings/commentators must not 5xx").toBeLessThan(500);
    await page.waitForLoadState("networkidle");

    const errorHeadings = await page
      .locator(
        "h1:has-text('Application error'), h1:has-text('Internal Server Error'), h1:text-is('Error')",
      )
      .count();
    expect(errorHeadings, "must not render an error heading").toBe(0);

    const body = (await page.textContent("body")) ?? "";
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Internal Server Error");

    expect(body.length).toBeGreaterThan(500);
    expect(body).toMatch(/解説者|評論家|commentator|ランキング|的中率|位/i);

    // Rows must actually exist — silent-empty must fail.
    const rows = page.getByTestId("commentator-row");
    const rowCount = await rows.count();
    expect(rowCount, "ranking page must render ≥3 commentator rows").toBeGreaterThanOrEqual(3);
  });

  test("top-3 commentator rows expose numeric scores in descending order", async ({
    page,
  }) => {
    await page.goto("/rankings/commentators");
    await page.waitForLoadState("networkidle");

    const rows = page.getByTestId("commentator-row");
    const rowCount = await rows.count();
    expect(rowCount, "must have ≥3 rows for descending-score check").toBeGreaterThanOrEqual(3);

    // Pull data-display-score off the first three rows and verify the values
    // are real numbers in non-increasing order.
    const top3Scores = await rows.evaluateAll((nodes) =>
      nodes.slice(0, 3).map((n) => (n as HTMLElement).dataset.displayScore ?? ""),
    );

    const parsed = top3Scores.map((raw) => {
      const n = Number.parseInt(raw, 10);
      expect(
        Number.isFinite(n),
        `commentator-row data-display-score must be numeric, got "${raw}"`,
      ).toBe(true);
      return n;
    });

    expect(
      parsed[0] >= parsed[1] && parsed[1] >= parsed[2],
      `top-3 scores must be sorted descending, got [${parsed.join(", ")}]`,
    ).toBe(true);

    // Each top-3 row must also surface the score visually, not just in data
    // attributes. fmtScore renders "+N" / "0" / "-N" — assert the text node
    // contains a signed/unsigned integer.
    for (let i = 0; i < 3; i++) {
      const text = (await rows.nth(i).textContent()) ?? "";
      expect(
        /[+-]?\d+/.test(text),
        `row ${i} should render a numeric score in its text, got "${text.slice(0, 80)}"`,
      ).toBe(true);
    }
  });

  test("/commentators/[slug] loads a detail page for the top commentator", async ({
    page,
    request,
  }) => {
    await page.goto("/rankings/commentators");
    await page.waitForLoadState("networkidle");

    // Prefer the slug attribute we control over a fragile href selector.
    const rows = page.getByTestId("commentator-row");
    const rowCount = await rows.count();
    expect(
      rowCount,
      "commentator ranking page rendered 0 rows — seed data is missing or the API is down",
    ).toBeGreaterThan(0);

    const slug = await rows.first().getAttribute("data-commentator-slug");
    expect(slug, "top commentator row must expose a slug").toBeTruthy();

    const detailRes = await request.get(`/commentators/${slug}`);
    expect(
      detailRes.status(),
      `/commentators/${slug} must not 5xx`,
    ).toBeLessThan(500);
    expect(
      detailRes.status(),
      `/commentators/${slug} must return 2xx/3xx`,
    ).toBeLessThan(400);
  });
});
