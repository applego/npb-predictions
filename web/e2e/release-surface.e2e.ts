import { expect, test, type Page } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/standings",
  "/games",
  "/news",
  "/newspaper",
  "/predictions",
  "/predictions/new",
  "/rankings",
  "/rankings/predictions?year=2026",
  "/rankings/live",
  "/rankings/titles",
  "/rankings/scoreboard?year=2026&view=year",
  "/rankings/scoreboard?year=2026&view=trend",
  "/rankings/all-time",
  "/rankings/commentators",
  "/groups",
  "/groups/join",
  "/settings",
  "/me",
  "/admin",
  "/archive/2024",
  "/archive/2024/predictions",
  "/seo/2026",
  "/seo/past-seasons",
  "/users/99999",
];

function recordFatalErrors(page: Page) {
  const fatalErrors: string[] = [];
  page.on("pageerror", (error) => {
    fatalErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (
      /favicon|firebase|auth\/|network|Failed to load resource|ResizeObserver/i.test(
        text,
      )
    ) {
      return;
    }
    fatalErrors.push(text);
  });
  return fatalErrors;
}

async function loadReleaseSurface(page: Page, path: string) {
  const fatalErrors = recordFatalErrors(page);
  const response = await page.goto(path);
  expect(response, `${path} must return a response`).not.toBeNull();
  expect(response!.status(), `${path} must not 5xx`).toBeLessThan(500);
  await page.waitForLoadState("networkidle");
  const body = (await page.textContent("body")) ?? "";
  expect(body, `${path} must not render a Next.js runtime error`).not.toMatch(
    /Application error|Internal Server Error|NEXT_REDIRECT/i,
  );
  expect(fatalErrors, `${path} must not emit fatal JS errors`).toHaveLength(0);
}

test.describe("release surface", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders without runtime failure`, async ({ page }) => {
      await loadReleaseSurface(page, route);
    });
  }

  test("scoreboard year/trend controls and duplicate-name metadata stay usable", async ({
    page,
  }) => {
    await loadReleaseSurface(page, "/rankings/scoreboard?year=2026&view=trend");

    const yearViewLink = page
      .locator('a[href="/rankings/scoreboard?year=2026&view=year"]')
      .first();
    const trendViewLink = page
      .locator('a[href="/rankings/scoreboard?year=2026&view=trend"]')
      .first();
    await expect(yearViewLink).toBeVisible();
    await expect(trendViewLink).toBeVisible();

    const trendActiveYearMetadata = page.locator("td").filter({
      hasText: /\d{4}(?:[-/]\d{4})?年/,
    });
    if ((await trendActiveYearMetadata.count()) === 0) {
      await expect(page.getByText("複数年のデータがある予想者がいません")).toBeVisible();
    } else {
      await expect(
        trendActiveYearMetadata.first(),
        "trend rows must expose active year metadata so duplicate names are distinguishable",
      ).toBeVisible();
    }

    const yearHref = await yearViewLink.getAttribute("href");
    expect(yearHref).toContain("view=year");
    await page.goto(yearHref!);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("view=year");
    await expect(
      page.locator("td").filter({ hasText: /2026年/ }).first(),
      "year rows must expose year metadata so duplicate names are distinguishable",
    ).toBeVisible();

    const refreshedTrendHref = await page
      .locator('a[href="/rankings/scoreboard?year=2026&view=trend"]')
      .first()
      .getAttribute("href");
    expect(refreshedTrendHref).toContain("view=trend");
    await page.goto(refreshedTrendHref!);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("view=trend");
  });

  test("safe visible buttons across public release routes do not crash", async ({
    page,
  }) => {
    const fatalErrors = recordFatalErrors(page);

    for (const path of PUBLIC_ROUTES) {
      const response = await page.goto(path);
      expect(response, `${path} must return a response`).not.toBeNull();
      expect(response!.status(), `${path} must not 5xx`).toBeLessThan(500);
      await page.waitForLoadState("networkidle");

      const buttons = page
        .getByRole("button")
        .filter({
          hasNotText:
            /Google|ログイン|ログアウト|共有|コピー|保存|削除|ダウンロード|PNG|Xで|送信|投稿|作成|参加/i,
        });
      const count = Math.min(await buttons.count(), 6);
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        if (!(await button.isVisible()) || !(await button.isEnabled())) continue;
        await button.click();
        await page.waitForTimeout(100);
      }
    }

    expect(fatalErrors, "safe button interactions must not crash").toHaveLength(
      0,
    );
  });
});
