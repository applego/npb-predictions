import { test, expect } from "@playwright/test";

test("public season APIs omit private fields and drafts on real local D1", async ({ request }) => {
  const list = await request.get("/api/seasons/2026/predictions");
  expect(list.status()).toBe(200);
  const rows = await list.json(); expect(rows.length).toBeGreaterThan(0);
  const locked = rows.find((p: { user: { slug: string } }) => p.user.slug === "e2e-public-locked");
  expect(locked).toBeDefined();
  expect(rows.some((p: { user: { slug: string } }) => p.user.slug === "e2e-private-draft")).toBe(false);
  for (const p of rows) { expect(p.isLocked).toBe(true); expect(p.user).not.toHaveProperty("email"); expect(p.user).not.toHaveProperty("firebaseUid"); }
  const detail = await request.get("/api/seasons/2026/users/e2e-public-locked");
  expect(detail.status()).toBe(200); expect((await detail.json()).user).toEqual(locked.user);
  expect((await request.get("/api/seasons/2026/users/e2e-private-draft")).status()).toBe(404);
  const own = await request.get("/api/seasons/2026/me?userId=" + locked.userId);
  expect(own.status()).toBe(401); expect(own.headers()["cache-control"]).toBe("private, no-store");
});

test("own prediction uses authenticated endpoint and separates errors from missing data", async ({ page }) => {
  test.setTimeout(60_000); // Two journeys and six viewport screenshots include browser I/O.
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase public build configuration is required for this auth UI scenario");
  const uid = "e2e-synthetic-owner";
  await page.addInitScript(({ apiKey, uid }) => {
    localStorage.setItem(`firebase:authUser:${apiKey}:[DEFAULT]`, JSON.stringify({
      uid, email: "fixture@example.invalid", emailVerified: true, displayName: "検証用 本人", isAnonymous: false,
      providerData: [], apiKey, appName: "[DEFAULT]", createdAt: "1770000000000", lastLoginAt: "1770000000000",
      stsTokenManager: { refreshToken: "synthetic-refresh", accessToken: "synthetic-id-token", expirationTime: Date.now() + 3600000 },
    }));
  }, { apiKey, uid });
  await page.route("https://identitytoolkit.googleapis.com/**", route => route.fulfill({ json: { users: [{ localId: uid, email: "fixture@example.invalid", emailVerified: true, displayName: "検証用 本人", providerUserInfo: [] }] } }));
  let completeLink!: () => void;
  const linkBarrier = new Promise<void>(resolve => { completeLink = resolve; });
  let linked = false;
  await page.route("**/api/auth/link-user", async route => {
    await linkBarrier; linked = true;
    await route.fulfill({ json: { id: 999999, name: "検証用 本人", slug: "e2e-synthetic-owner", role: "friend", firebaseUid: uid } });
  });
  const consoleErrors: string[] = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.route("**/api/settings", route => route.fulfill({ json: {} }));
  await page.route("**/api/my-rank?*", route => route.fulfill({ json: { rank: null, score: null, delta: null } }));
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("**/api/groups/my", route => route.fulfill({ json: { groups: [] } }));
  let status = 200;
  let calls = 0;
  await page.route("**/api/seasons/2026/me", async route => {
    expect(linked, "owner reads must wait for account linking").toBe(true);
    expect(route.request().headers().authorization).toBe("Bearer synthetic-id-token"); calls++;
    await route.fulfill({ status, json: status === 200 ? { user: { name: "検証用 本人" }, rankingPicks: [{ league: "central", rank: 1, teamName: "阪神タイガース" }] } : { error: "fixture boundary" } });
  });
  let publicFetches = 0;
  page.on("request", req => { if (/\/api\/seasons\/2026\/predictions(?:\?|$)/.test(req.url())) publicFetches++; });
  await page.goto("/rankings/commentators?year=2026");
  await page.getByRole("button", { name: "📰 新聞PNG", exact: true }).click();
  await page.getByRole("button", { name: "全解除", exact: true }).click();
  const toggle = page.getByRole("checkbox", { name: "自分の予想を先頭に追加" });
  await toggle.check();
  await expect(page.getByText("(アカウントを確認中...)", { exact: true })).toBeVisible();
  expect(calls).toBe(0);
  completeLink();
  await expect(page.getByRole("button", { name: "↓ PNG ダウンロード (1列)", exact: true })).toBeVisible();
  expect(calls).toBe(1); expect(publicFetches).toBe(0);
  expect(consoleErrors).toEqual([]);
  for (const width of [1400, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await toggle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`comparison-success-${width}.png`) });
  }
  await toggle.uncheck(); status = 503; await toggle.check();
  await expect(page.getByRole("alert").filter({ hasText: "予想を取得できませんでした" })).toBeVisible();
  await expect(page.getByText("(この年の予想データなし)", { exact: true })).toHaveCount(0);
  for (const width of [1400, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("alert").filter({ hasText: "予想を取得できませんでした" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`comparison-error-${width}.png`) });
  }
  await toggle.uncheck(); status = 404; await toggle.check();
  await expect(page.getByText("(この年の予想データなし)", { exact: true })).toBeVisible();
  expect(calls).toBe(3); expect(publicFetches).toBe(0);
  expect(pageErrors).toEqual([]);
  for (const width of [1400, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`comparison-${width}.png`), fullPage: false });
  }
  consoleErrors.length = 0; // The preceding 503/404 were deliberate response fault injection.
  status = 200;
  await page.goto("/me");
  await expect(page.getByText("阪神タイガース", { exact: false })).toBeVisible();
  await expect(page.getByText("まだ予想はありません", { exact: true })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  for (const width of [1400, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`self-prediction-${width}.png`), fullPage: false });
  }
});
