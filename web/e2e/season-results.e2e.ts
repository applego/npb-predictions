import { expect, test } from "@playwright/test";

// All fixtures stay in isolated local D1. Never substitute fabricated production data.
test.describe("season review readability", () => {
  test("public results render observed data without login", async ({ page }, testInfo) => {
    expect((await page.goto("/?year=2026&league=central"))?.status()).toBe(200);
    await testInfo.attach("public-results-body", { body: await page.locator("main").innerText(), contentType: "text/plain" });
    await expect(page.getByRole("heading", { name: /予想の答えは、\s*結果にある。/ })).toBeVisible();
    await expect(page.locator("main .result-status")).toHaveText("暫定");
    await expect(page.locator("main .result-observation time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T/);
    await expect(page.locator("main .result-person").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("歴代最高");
    await page.locator("main .result-context > summary").click();
    await page.locator("main .result-standings-fold > summary").click();
    await expect(page.locator("main .result-team-strip li")).toHaveCount(6);
  });
  test("league navigation retains the year", async ({ page }) => {
    await page.goto("/rankings?year=2026&league=central");
    await page.getByRole("navigation", { name: "答え合わせのリーグ" }).getByRole("link", { name: "パ・リーグ", exact: true }).click();
    await expect(page).toHaveURL(/year=2026&league=pacific/);
    await expect(page.getByRole("navigation", { name: "答え合わせのリーグ" }).getByRole("link", { name: "パ・リーグ", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("main .result-person").first()).toBeVisible();
  });
  test("closed rows expose comparisons; search and details work", async ({ page }) => {
    await page.goto("/rankings?year=2026&league=central");
    const first = page.locator("main .result-person").first();
    await expect(first).toBeVisible();
    await expect(first.locator(".result-deviation")).toBeVisible();
    await expect(first.locator(".result-difference")).toBeVisible();
    await expect(first.locator(".result-source-label")).toBeVisible();
    const name = await first.locator(".result-person-name strong").innerText();
    await page.getByRole("searchbox", { name: "解説者・出典を検索" }).fill(name);
    await expect(first.locator(".result-person-name strong")).toHaveText(name);
    await first.locator("summary").click();
    await expect(page.locator("main .result-person[open] tbody tr")).toHaveCount(6);
    await expect(page.locator("main .result-person[open] .result-person-note")).toContainText("集計基準");
    await page.getByRole("searchbox").fill("__does_not_exist__");
    await expect(page.locator("main .result-person")).toHaveCount(0);
    await page.getByRole("button", { name: "絞り込みを解除" }).click();
    await expect(first).toBeVisible();
  });
  test("denied clipboard does not claim success", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new DOMException("denied", "NotAllowedError"); } } });
    });
    await page.goto("/rankings?year=2026&league=central");
    const share = page.locator("main .result-board-share");
    await share.getByRole("button", { name: "結果をシェア", exact: true }).click();
    await expect(share.getByRole("textbox", { name: "共有リンク" })).toHaveValue(/\/rankings\?year=2026&league=central/);
    await expect(share).not.toContainText("リンクをコピーしました");
  });
  for (const width of [320, 390, 1400]) {
    test(`readable result layout at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/?year=2026&league=central");
      const first = page.locator("main .result-person").first();
      await expect(first).toBeVisible();
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
      if (width === 390) {
        const box = await first.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y + Math.min(box!.height, 70), "name + score must enter the first screen above bottom navigation").toBeLessThan(780);
        expect(await first.locator(".result-person-name strong").evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);
      }
      await testInfo.attach(`readable-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      await page.locator("main .result-context > summary").click();
      await page.locator("main .result-standings-fold > summary").click();
      expect(await page.locator("main .result-team-strip b").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      await first.locator("summary").click();
      await expect(page.locator("main .result-person[open] tbody tr")).toHaveCount(6);
      await testInfo.attach(`expanded-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    });
  }
  test("200% text stays operable without document overflow", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?year=2026&league=central");
    await expect(page.locator("main .result-person").first()).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await page.locator("main .result-person").first().locator("summary").click();
    await expect(page.locator("main .result-person[open] tbody tr")).toHaveCount(6);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await testInfo.attach("text-200-percent", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });
});


test("search survives reload and shared result opens its details", async ({ page }) => {
  await page.goto("/rankings?year=2026&league=central");
  const first = page.locator("main .result-person").first();
  await expect(first).toBeVisible();
  const name = await first.locator(".result-person-name strong").innerText();
  const id = await first.getAttribute("id");
  const search = page.getByRole("searchbox");
  await search.fill(name);
  await expect(page).toHaveURL(/q=/);
  await page.reload();
  await expect(search).toHaveValue(name);
  await expect(page.locator("main .result-person-name")).toContainText([name]);
  await page.goto(`/rankings?year=2026&league=central#${id}`);
  await expect(page.locator(`main #${id}`)).toHaveAttribute("open", "");
  await expect(page.locator(`main #${id} tbody tr`)).toHaveCount(6);
  await search.fill("存在しない予想者ZZZ");
  await expect(page.getByRole("heading", { name: "条件に合う予想がありません" })).toBeVisible();
  await page.getByRole("button", { name: "絞り込みを解除" }).click();
  await expect(page.locator("main .result-person").first()).toBeVisible();
});

test("X intent preserves commentator year league and attribution", async ({ page }) => {
  await page.goto("/rankings?year=2026&league=central");
  const first = page.locator("main .result-person").first();
  await first.locator("summary").click();
  const name = await first.locator(".result-person-name strong").innerText();
  const share = first.getByRole("link", { name: "この結果をXで共有する" });
  await expect(share).toBeVisible();
  const intent = new URL((await share.getAttribute("href"))!);
  expect(intent.origin).toBe("https://x.com");
  expect(intent.pathname).toBe("/intent/post");
  expect(intent.searchParams.get("text")).toContain(name);
  expect(intent.searchParams.get("text")).toContain("暫定");
  const destination = new URL(intent.searchParams.get("url")!);
  expect(destination.searchParams.get("year")).toBe("2026");
  expect(destination.searchParams.get("league")).toBe("central");
  expect(destination.searchParams.get("utm_source")).toBe("x");
  expect(destination.hash).toBe(`#${await first.getAttribute("id")}`);
});

test("result card downloads a real PNG with the selected scope", async ({ page }) => {
  await page.goto("/rankings?year=2026&league=central");
  const first = page.locator("main .result-person").first();
  await first.locator("summary").click();
  const downloaded = page.waitForEvent("download");
  await first.getByRole("button", { name: "結果カードを画像で保存 ↓" }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^npb-2026-central-\d+\.png$/);
  const file = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of file!) chunks.push(Buffer.from(chunk));
  const image = Buffer.concat(chunks);
  expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(image.readUInt32BE(16)).toBe(1200);
  expect(image.readUInt32BE(20)).toBe(900);
  expect(image.length).toBeGreaterThan(10000);
});

test("growth events enforce origin validation and admin-only aggregates", async ({ request, baseURL }) => {
  const data = { id: crypto.randomUUID(), session: crypto.randomUUID(), event: "x_share_start", year: 2026, league: "central", source: "x" };
  expect((await request.post("/api/growth/events", { data, headers: { Origin: "https://evil.example" } })).status()).toBe(403);
  expect((await request.post("/api/growth/events", { data: { ...data, event: "publish_success" }, headers: { Origin: baseURL! } })).status()).toBe(400);
  expect((await request.post("/api/growth/events", { data, headers: { Origin: baseURL! } })).status()).toBe(204);
  expect((await request.get("/api/growth/events")).status()).toBe(401);
});
