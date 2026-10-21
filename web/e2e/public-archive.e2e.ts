import { expect, test } from "@playwright/test";

test("published final results stay available without a database", async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "doNotTrack", { value: "1" }));
  await page.setViewportSize({ width: 390, height: 844 });
  const backgroundLegacy: string[] = [];
  page.on("request", (request) => { const url = new URL(request.url()); if (request.resourceType() === "fetch" && /^\/(users\/|rankings\/(predictions|scoreboard|all-time)|groups)/.test(url.pathname)) backgroundLegacy.push(url.pathname); });
  const errors: string[] = [];page.on("pageerror", (error) => errors.push(error.message));
  for (const league of ["central", "pacific"]) {
    expect((await page.goto(`/?year=2026&league=${league}`))?.status()).toBe(200);
    await expect(page.locator("main .result-status")).toHaveText("確定");
    const coverage = page.locator("main").getByLabel("収録範囲");
    await coverage.locator("summary").click();
    await expect(coverage.locator("p")).toBeVisible();
    await expect(coverage).toContainText("パのみ登録の人は含みません");
    await coverage.locator("summary").click();
    const person = page.locator("main .result-person").first();
    await expect(person).toBeVisible(); await person.locator("summary").click();
    await expect(person.locator("tbody tr")).toHaveCount(6);
    if (league === "central") await expect(person.locator(".result-source-label")).toContainText("web Sportiva");
    const intent = new URL((await person.getByRole("link", { name: "この結果をXで共有する" }).getAttribute("href"))!);
    expect(intent.searchParams.get("text")).toContain("確定");
    const waiting = page.waitForEvent("download");
    await person.getByRole("button", { name: "結果カードを画像で保存 ↓" }).click();
    const download = await waiting;
    const stream = await download.createReadStream();const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const png = Buffer.concat(chunks);expect(png.subarray(0,8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1200);expect(png.readUInt32BE(20)).toBe(900);
    expect(await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
    await testInfo.attach(`published-${league}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  }
  expect(errors).toEqual([]);
  expect(backgroundLegacy).toEqual([]);
});
