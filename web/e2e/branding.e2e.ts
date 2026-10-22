import { expect, test } from "@playwright/test";

test("site and social previews use the same new name", async ({ page, request }) => {
  await page.goto("/?year=2026&league=central");
  await expect(page).toHaveTitle(/みんなの順位予想対決/);
  await expect(page.getByRole("link", { name: "みんなの順位予想対決 トップ" })).toBeVisible();
  expect(await page.locator('meta[property="og:site_name"]').getAttribute("content")).toBe("みんなの順位予想対決");
  expect(await page.locator("body").innerText()).not.toMatch(/NPB.?予想リーグ|NPB Predictions|NPB予想スポーツ/);
  const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(image).toBeTruthy();
  const result = await request.get(new URL(image!, page.url()).pathname);
  expect(result.status()).toBe(200);
  expect(result.headers()["content-type"]).toContain("image/png");
  const png = await result.body();
  expect(png.readUInt32BE(16)).toBe(1200); expect(png.readUInt32BE(20)).toBe(630);
  const person = page.locator("main .result-person").first();
  await person.locator("summary").click();
  const intent = new URL((await person.getByRole("link", { name: "この結果をXで共有する" }).getAttribute("href"))!);
  expect(intent.searchParams.get("text")).toContain("みんなの順位予想対決");
});

for (const scope of ["central", "all"]) {
  test(`branded card keeps result details for ${scope} and a long fixture name`, async ({ page }, testInfo) => {
    const name = "検証用 とても長い名前の解説者とスポーツ番組の共同予想";
    await page.route(`**/rankings?year=2026&league=${scope}`, async route => {
      const response = await route.fetch();
      const body = (await response.text()).replaceAll("検証用 解説者A", name);
      await route.fulfill({ response, body });
    });
    await page.addInitScript(() => {
      const words: string[] = [];
      Object.assign(window, { cardWords: words });
      const draw = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(value, ...args) {
        words.push(value); return draw.call(this, value, ...args);
      };
    });
    await page.goto(`/rankings?year=2026&league=${scope}`);
    const person = page.locator("main .result-person").filter({ hasText: name }).first();
    await person.locator("summary").click();
    await expect(person.locator("tbody tr")).toHaveCount(scope === "all" ? 12 : 6);
    const waiting = page.waitForEvent("download");
    await person.getByRole("button", { name: "結果カードを画像で保存 ↓" }).click();
    const download = await waiting;
    const file = testInfo.outputPath(`card-${scope}.png`);
    await download.saveAs(file);
    await testInfo.attach(`card-${scope}`, { path: file, contentType: "image/png" });
    const words = await page.evaluate(() => (window as unknown as { cardWords: string[] }).cardWords);
    expect(words).toContain(name);
    expect(words).toContain("みんなの順位予想対決");
    expect(words.join(" ")).toContain("暫定");
    expect(words.join(" ")).toContain("集計：");
    expect(words.join(" ")).not.toMatch(/NPB.?予想リーグ/);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}
