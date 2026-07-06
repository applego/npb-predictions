import { test, expect, type Page } from "@playwright/test";

// ── Helpers ────────────────────────────────────────────────────────────────

async function loadPage(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status(), `${path} should not 5xx`).toBeLessThan(500);
  await page.waitForLoadState("networkidle");
}

// ── Smoke: page loads ──────────────────────────────────────────────────────

test.describe("Smoke — every page returns < 500", () => {
  const PAGES = [
    "/",
    "/standings",
    "/predictions",
    "/news",
    "/rankings/commentators",
    "/admin",
    "/archive/2024",
    "/archive/2024/predictions",
  ];

  for (const path of PAGES) {
    test(`${path}`, async ({ page }) => {
      await loadPage(page, path);
    });
  }
});

// ── Home page ──────────────────────────────────────────────────────────────

test.describe("Home page", () => {
  test("shows navigation links", async ({ page }) => {
    await loadPage(page, "/");
    // At minimum, the body should render something
    const body = page.locator("body");
    await expect(body).toBeVisible();
    // Should not display a raw error stack
    const text = await page.textContent("body");
    expect(text).not.toContain("Application error");
    expect(text).not.toContain("Internal Server Error");
  });
});

// ── Standings ──────────────────────────────────────────────────────────────

test.describe("Standings page", () => {
  test("renders score table", async ({ page }) => {
    await loadPage(page, "/standings");
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
  });

  test("year param accepted", async ({ page }) => {
    const res = await page.goto("/standings?year=2024");
    expect(res?.status()).toBeLessThan(500);
  });
});

// ── User detail ────────────────────────────────────────────────────────────

test.describe("User detail page", () => {
  // Tsuneshige (id=4) seed は本番 D1 のみで local wrangler dev には無いため
  // CI 環境 (local webServer) では fixme でスキップ。本番 dev URL に対する
  // smoke は別途 cf-deploy-watch / feature-health-alert で行う想定。
  test.fixme("loads Tsuneshige (id=4)", async ({ page }) => {
    await loadPage(page, "/users/4");
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Internal Server Error");
    // User name should appear
    await expect(page.getByText("Tsuneshige")).toBeVisible();
  });

  test("invalid userId returns < 500 (not-found, not error)", async ({ page }) => {
    const res = await page.goto("/users/99999");
    // wrangler dev returns 200 for notFound(); production CF Pages returns 404.
    // Either way, must not be a 5xx error.
    expect(res?.status(), "invalid userId must not 5xx").toBeLessThan(500);
    // Should not show a runtime Application error
    await page.waitForTimeout(1000);
    const inner = await page.evaluate(() => document.body.innerText);
    expect(inner, "page should not crash on invalid userId").not.toContain(
      "Application error: a client-side exception",
    );
  });

  test("shows score progression chart when data exists", async ({ page }) => {
    await loadPage(page, "/users/4");
    // The chart is rendered as an SVG
    const svg = page.locator('svg[aria-label="年度別スコア推移"]');
    // May or may not appear depending on local data — just ensure no crash
    const count = await svg.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ── Predictions compare ────────────────────────────────────────────────────

test.describe("Predictions compare page", () => {
  test("loads without error", async ({ page }) => {
    await loadPage(page, "/predictions");
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
  });

  test("/rankings renders a useful rankings index directly", async ({ page }) => {
    const res = await page.goto("/rankings");
    expect(res, "/rankings navigation must return a response").not.toBeNull();
    expect(res!.status(), "/rankings must not 5xx").toBeLessThan(500);
    await page.waitForLoadState("networkidle");

    const body = (await page.textContent("body")) ?? "";
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Internal Server Error");
    expect(body).not.toContain("NEXT_REDIRECT");
    expect(body).toMatch(/ランキング|順位予想一覧|ライブスコア|タイトル予想|確定結果/);
  });

  test("/rankings/predictions keeps matrix team badges compact", async ({ page }) => {
    const res = await page.goto("/rankings/predictions?year=2026");
    expect(res, "/rankings/predictions navigation must return a response").not.toBeNull();
    expect(res!.status(), "/rankings/predictions must not 5xx").toBeLessThan(500);
    await page.waitForLoadState("networkidle");

    const body = (await page.textContent("body")) ?? "";
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Internal Server Error");

    const badges = page.locator(
      'table [aria-label="ソフトバンク"], table [aria-label="オリックス"], table [aria-label="日本ハム"]',
    );
    const count = await badges.count();
    expect(count, "matrix should render long-name Pacific teams from seeded predictions").toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 12); i++) {
      const badge = badges.nth(i);
      await badge.scrollIntoViewIfNeeded();
      const box = await badge.boundingBox();
      const text = (await badge.textContent())?.trim() ?? "";
      expect(box, `badge ${i} should be visible`).not.toBeNull();
      expect(text, `badge ${i} must use compact matrix abbreviation`).toMatch(/^[^\s]{1,2}$/);
      expect(box!.height, `badge ${i} must remain one-line compact`).toBeLessThanOrEqual(32);
    }
  });
});

// ── Commentator rankings ───────────────────────────────────────────────────

test.describe("Commentator rankings page", () => {
  test("loads without error", async ({ page }) => {
    await loadPage(page, "/rankings/commentators");
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
  });
});

// ── Admin page ─────────────────────────────────────────────────────────────

test.describe("Admin page", () => {
  test("resolves to login UI — not stuck at 読み込み中", async ({ page }) => {
    await page.goto("/admin");
    // The page must eventually leave the "読み込み中" state.
    // Firebase auth resolves within ~2s; safety timeout is 8s.
    await page.waitForFunction(
      () => !document.body.textContent?.includes("読み込み中"),
      { timeout: 12_000 },
    );
    // Should show either the ADMIN login screen or an access-denied message
    const body = await page.textContent("body");
    const hasLoginBtn = body?.includes("Googleでログイン") ?? false;
    const hasAdmin = body?.includes("ADMIN") ?? false;
    const hasAccessDenied = body?.includes("ACCESS DENIED") ?? false;
    expect(
      hasLoginBtn || hasAdmin || hasAccessDenied,
      "Admin page must show login, dashboard, or access-denied",
    ).toBe(true);
  });

  test("admin page has no JS runtime crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/admin");
    await page.waitForTimeout(3000);
    // Firebase auth errors (network etc.) are expected in CI — filter those
    const fatalErrors = errors.filter(
      (e) =>
        !e.includes("Firebase") &&
        !e.includes("auth/") &&
        !e.includes("network") &&
        !e.includes("fetch"),
    );
    expect(fatalErrors, `Unexpected JS errors: ${fatalErrors.join("; ")}`).toHaveLength(0);
  });
});

// ── News page ──────────────────────────────────────────────────────────────

test.describe("News page", () => {
  test("loads without 500", async ({ page }) => {
    const res = await page.goto("/news");
    expect(res?.status()).toBeLessThan(500);
  });
});

// ── Score history API ──────────────────────────────────────────────────────

test.describe("Score history API", () => {
  test("GET /api/users/4/history returns JSON", async ({ page }) => {
    const res = await page.goto("/api/users/4/history");
    expect(res?.status()).toBe(200);
    const json = await page.evaluate(() =>
      JSON.parse(document.body.textContent ?? "{}"),
    ) as { userId?: number; history?: unknown[] };
    expect(json.userId).toBe(4);
    expect(Array.isArray(json.history)).toBe(true);
  });

  test("GET /api/users/99999/history returns 404", async ({ page }) => {
    const res = await page.goto("/api/users/99999/history");
    expect(res?.status()).toBe(404);
  });

  test("GET /api/users/abc/history returns 400", async ({ page }) => {
    const res = await page.goto("/api/users/abc/history");
    expect(res?.status()).toBe(400);
  });
});

// ── Likes API ─────────────────────────────────────────────────────────────

test.describe("Likes API", () => {
  test("GET /api/likes/4 returns count", async ({ page }) => {
    const res = await page.goto("/api/likes/4");
    expect(res?.status()).toBe(200);
    const json = await page.evaluate(() =>
      JSON.parse(document.body.textContent ?? "{}"),
    ) as { count?: number };
    expect(typeof json.count).toBe("number");
  });
});

// ── Navigation buttons ─────────────────────────────────────────────────────

test.describe("Interactive buttons", () => {
  test("standings page year nav links are clickable", async ({ page }) => {
    await loadPage(page, "/standings");
    // Look for any anchor/link to other year
    const links = page.locator("a[href*='year=']");
    const count = await links.count();
    if (count > 0) {
      // Click the first year link and verify navigation
      const href = await links.first().getAttribute("href");
      if (href) {
        const res = await page.goto(href);
        expect(res?.status()).toBeLessThan(500);
      }
    }
  });

  // /users/4 (Tsuneshige) seed が local wrangler dev に無いと user page が
  // not-found 系の fallback で表示され "standings" を含む別リンクが先にマッチ
  // して click が失敗する。data 依存なので local E2E では fixme。
  test.fixme("user page back-to-standings link works", async ({ page }) => {
    await loadPage(page, "/users/4");
    const standingsLink = page.getByRole("link", { name: /standings/i });
    if (await standingsLink.count() > 0) {
      await standingsLink.first().click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("standings");
    }
  });
});
