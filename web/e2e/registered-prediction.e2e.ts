import { test, expect, type Page } from "@playwright/test";

// A prediction saved on the site before the season carries its saved time everywhere it is shown:
// My Page, the picture, the share text, and the commentator sheet (where it is ranked, not "reference").
// Data: synthetic users from src/db/fixtures/e2e-results.sql; the signed-in owner is mocked at the auth boundary.

const SAVED = "2026-03-20T03:00:00.000Z"; // 12:00 JST
const LOCKED = "2026-03-27T09:00:00.000Z";
const CENTRAL = ["阪神タイガース", "読売ジャイアンツ", "横浜DeNAベイスターズ", "広島東洋カープ", "中日ドラゴンズ", "東京ヤクルトスワローズ"];
const PACIFIC = ["福岡ソフトバンクホークス", "北海道日本ハムファイターズ", "オリックス・バファローズ", "東北楽天ゴールデンイーグルス", "埼玉西武ライオンズ", "千葉ロッテマリーンズ"];

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

async function signIn(page: Page, own: Record<string, unknown> | null) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase public build configuration is required for this auth UI scenario");
  const uid = "e2e-synthetic-owner";
  await page.addInitScript(({ apiKey, uid }) => {
    localStorage.setItem(`firebase:authUser:${apiKey}:[DEFAULT]`, JSON.stringify({
      uid, email: "fixture@example.invalid", emailVerified: true, displayName: "検証用 本人", isAnonymous: false,
      providerData: [], apiKey, appName: "[DEFAULT]", createdAt: "1770000000000", lastLoginAt: "1770000000000",
      stsTokenManager: { refreshToken: "synthetic-refresh", accessToken: "synthetic-id-token", expirationTime: Date.now() + 3600000 },
    }));
    // Record what the picture prints; the canvas has no DOM text to read.
    const texts: string[] = [];
    (window as unknown as { __canvasTexts: string[] }).__canvasTexts = texts;
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text: string, x: number, y: number, max?: number) {
      texts.push(text);
      return max === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, max);
    };
  }, { apiKey, uid });
  await page.route("https://identitytoolkit.googleapis.com/**", (route) => route.fulfill({ json: { users: [{ localId: uid, email: "fixture@example.invalid", emailVerified: true, displayName: "検証用 本人", providerUserInfo: [] }] } }));
  await page.route("**/api/auth/link-user", (route) => route.fulfill({ json: { id: 999999, name: "検証用 本人", slug: "e2e-synthetic-owner", role: "friend", firebaseUid: uid } }));
  await page.route("**/api/settings", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/my-rank?*", (route) => route.fulfill({ json: { rank: null, score: null, delta: null } }));
  await page.route("**/api/groups/my", (route) => route.fulfill({ json: { groups: [] } }));
  await page.route("**/api/seasons/*/me", (route) => {
    if (!own || !route.request().url().includes("/2026/me")) return route.fulfill({ status: 404, json: { error: "Prediction not found" } });
    return route.fulfill({ json: {
      ...own,
      rankingPicks: [
        ...CENTRAL.map((teamName, i) => ({ league: "central", rank: i + 1, teamName })),
        ...PACIFIC.map((teamName, i) => ({ league: "pacific", rank: i + 1, teamName })),
      ],
    } });
  });
}

test("My Page shows the saved time, the fixed state and puts the date on the picture and share text", async ({ page, context }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await signIn(page, { updatedAt: SAVED, isLocked: true, lockedAt: LOCKED });
  await page.goto("/me");
  const line = page.getByTestId("registration-2026");
  await expect(line).toContainText("登録 2026年3月20日 12:00・固定済み（変更できません）");
  await expect(line.getByRole("link", { name: "解説者と並べて答え合わせ →" })).toHaveAttribute("href", "/sheet?year=2026&league=central&u=999999");

  await page.getByRole("button", { name: "画像を生成する" }).first().click();
  await page.getByRole("button", { name: "画像を生成する" }).first().click();
  await expect(page.getByRole("button", { name: "Xでシェア" })).toBeVisible();
  const printed = await page.evaluate(() => (window as unknown as { __canvasTexts: string[] }).__canvasTexts);
  expect(printed).toContain("予想者: 検証用 本人　2026年3月20日登録・開幕前に固定");

  await context.route("https://x.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>x</p>" }));
  await context.route("https://twitter.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>x</p>" }));
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Xでシェア" }).click();
  const intent = new URL((await popup).url());
  expect(intent.searchParams.get("text")).toContain("検証用 本人の2026年プロ野球順位予想（開幕前の3/20に登録・固定）を公開!");
  for (const width of [1400, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await line.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`me-registered-${width}.png`) });
  }
  expect(errors).toEqual([]);
});

test("a prediction that can still change says until when, and puts no date on the picture or comparison", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, { updatedAt: SAVED, isLocked: false, lockedAt: null });
  await page.goto("/me");
  const line = page.getByTestId("registration-2026");
  await expect(line).toContainText("登録 2026年3月20日 12:00・");
  await expect(line).not.toContainText("固定済み");
  await expect(line.getByRole("link")).toHaveCount(0);
  // The date is proof only once fixed; an editable prediction is pictured without it.
  await page.getByRole("button", { name: "画像を生成する" }).first().click();
  await page.getByRole("button", { name: "画像を生成する" }).first().click();
  await expect(page.getByRole("button", { name: "Xでシェア" })).toBeVisible();
  const printed = await page.evaluate(() => (window as unknown as { __canvasTexts: string[] }).__canvasTexts);
  expect(printed).toContain("予想者: 検証用 本人");
  expect(printed.join()).not.toContain("登録");
  expect(errors).toEqual([]);
});

test("a signed-in participant with no prediction is told so and pointed to make one", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, null);
  await page.goto("/me");
  await expect(page.getByText("まだ予想はありません", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "予想をつくる →" })).toHaveAttribute("href", "/predictions/new");
  // "No prediction" is the deliberate 404 of the own-prediction API; the browser logs it as a failed resource.
  expect(errors.filter((e) => !e.includes("status of 404"))).toEqual([]);
});

test("the sheet ranks a prediction fixed before the season with its saved date, and refuses hand-locked rows", async ({ page, context, request }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await page.route("**/api/settings", (route) => route.fulfill({ json: {} }));
  const registered = await (await request.get("/api/seasons/2026/users/e2e-registered")).json();
  expect(registered.lockedAt).toBe(LOCKED);

  await page.goto(`/sheet?year=2026&league=central&u=${registered.userId}`);
  const board = page.locator(".sheet-board:visible");
  const row = board.locator(`.sheet-row`).filter({ hasText: "検証用 登録済み" });
  await expect(row.locator(".sheet-name")).toContainText("2026年3月20日登録・開幕前に固定");
  await expect(row.locator(".sheet-name")).not.toContainText("参考");
  await expect(row.locator(".sheet-metrics")).toBeVisible();
  // Ranked with the commentators by score, unlike entered rows that always go last.
  const scores = await board.locator(".sheet-row:not(.sheet-row-header):not(.sheet-row-actual) .sheet-metrics span:last-child b").allTextContents();
  expect(scores.map(Number)).toEqual([...scores.map(Number)].sort((a, b) => b - a));
  for (const width of [1400, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`sheet-registered-${width}.png`) });
  }

  await context.route("https://x.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>x</p>" }));
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Xで共有する" }).click();
  const intent = new URL((await popup).url());
  expect(intent.searchParams.get("text")).toContain("検証用 登録済みさん（開幕前の3/20に登録・固定）");
  expect(intent.searchParams.get("url")).toContain(`u=${registered.userId}`);

  // The league switch keeps the participant.
  await page.getByRole("link", { name: "パ・リーグ" }).click();
  await expect(board.locator(".sheet-row").filter({ hasText: "2026年3月20日登録・開幕前に固定" })).toHaveCount(1);

  // Locked by hand with no lock time on record: not shown as a dated, fixed prediction.
  const handLocked = await (await request.get("/api/seasons/2026/users/e2e-public-locked")).json();
  await page.goto(`/sheet?year=2026&league=central&u=${handLocked.userId}`);
  await expect(page.getByRole("heading", { name: "順位予想一覧" })).toBeVisible();
  await expect(board.locator(".sheet-registered")).toHaveCount(0);
  // While streaming, React keeps a hidden copy of the page; only the visible note counts.
  await expect(page.locator(".sheet-help:visible", { hasText: "この参加者の予想は、開幕前に登録・固定した記録が無いため表示していません。" })).toHaveCount(1);
  expect(errors).toEqual([]);
});
