import { expect, test } from "@playwright/test";

// CI's isolated D1 fixture has complete, non-final July 2026 standings.
// No production database writes, no conditional skips, no fake success fallbacks.
test.describe("season review release surface", () => {
  test("public home shows a real result board without login", async ({ page }) => {
    const response = await page.goto("/?year=2026&league=central");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /プロ野球.*順位予想の.*答え合わせ。/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "答え合わせのリーグ" })).toBeVisible();
    await expect(page.locator(".result-status")).toHaveText("暫定");
    await expect(page.locator(".result-team-strip li")).toHaveCount(6);
    await expect(page.locator(".result-source time")).toHaveAttribute("datetime", /2026-07-06/);
    await expect(page.locator(".result-person").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("歴代最高");
  });
  test("league navigation retains year and updates the result scope", async ({ page }) => {
    await page.goto("/rankings?year=2026&league=central");
    await page.getByRole("navigation", { name: "答え合わせのリーグ" }).getByRole("link", { name: "パ・リーグ", exact: true }).click();
    await expect(page).toHaveURL(/year=2026&league=pacific/);
    await expect(page.getByRole("navigation", { name: "答え合わせのリーグ" }).getByRole("link", { name: "パ・リーグ", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".result-team-strip li")).toHaveCount(6);
  });
  test("name search filters results and a row expands to six comparisons", async ({ page }) => {
    await page.goto("/rankings?year=2026&league=central");
    const first = page.locator(".result-person").first();
    await expect(first).toBeVisible();
    const name = await first.locator(".result-person-name strong").innerText();
    await page.getByRole("searchbox", { name: "解説者・出典を検索" }).fill(name);
    await expect(page.locator(".result-person").first().locator(".result-person-name strong")).toHaveText(name);
    await page.locator(".result-person").first().locator("summary").click();
    await expect(page.locator(".result-person[open] tbody tr")).toHaveCount(6);
    await page.getByRole("searchbox").fill("__does_not_exist__");
    await expect(page.locator(".result-person")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "条件に合う予想がありません" })).toBeVisible();
    await page.getByRole("button", { name: "絞り込みを解除" }).click();
    await expect(page.locator(".result-person").first()).toBeVisible();
  });
  test("failed clipboard is not reported as copied", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new DOMException("denied", "NotAllowedError"); } } });
    });
    await page.goto("/rankings?year=2026&league=central");
    await page.getByRole("button", { name: "結果をシェア", exact: true }).first().click();
    await expect(page.getByRole("textbox", { name: "共有リンク" }).first()).toHaveValue(/\/rankings\?year=2026&league=central/);
    await expect(page.locator(".result-list-heading")).not.toContainText("リンクをコピーしました");
  });
  for (const width of [320, 390, 1440]) {
    test(`result layout fits ${width}px viewport`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/?year=2026&league=central");
      await expect(page.locator(".result-person").first()).toBeVisible();
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
      await testInfo.attach(`season-results-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    });
  }
});
