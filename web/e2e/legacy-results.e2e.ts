import { expect, test } from "@playwright/test";

for (const route of ["/rankings/predictions?year=2026", "/rankings/all-time"]) {
  test(`legacy table stays bounded and searchable: ${route}`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const table = page.locator("main table");
    await expect(table).toBeVisible();
    const rows = table.locator("tbody tr").filter({ has: page.locator("td") });
    expect(await rows.count()).toBeGreaterThan(0);
    expect(await rows.count()).toBeLessThanOrEqual(20);
    await testInfo.attach("legacy-table-mobile", { body: await page.screenshot(), contentType: "image/png" });
    const firstName = (await rows.first().locator(route.includes("all-time") ? "td a" : "td > div").first().innerText()).trim();
    const pagination = page.getByRole("navigation", { name: route.includes("all-time") ? "通算ランキングのページ" : "予想一覧のページ" });
    await pagination.getByRole(route.includes("all-time") ? "button" : "link", { name: "次へ" }).click();
    await expect(rows.first()).not.toContainText(firstName);
    const search = page.getByRole("textbox", { name: route.includes("all-time") ? "解説者名で検索" : "予想者名で検索" });
    await search.fill(firstName);
    if (route.includes("predictions")) await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(rows.first()).toContainText(firstName);
    if (route.includes("all-time")) {
      const data = await (await request.get("/api/rankings/all-time")).json() as { commentators: { name: string; rank: number; slug: string }[] };
      const last = data.commentators[data.commentators.length - 1];
      expect(last.rank).toBeGreaterThan(20);
      await search.fill(last.name);
      const result = rows.filter({ has: page.locator(`a[href="/commentators/${last.slug}"]`) }).first();
      await expect(result.locator("td").first()).toHaveText(String(last.rank));
    }
    await search.fill("存在しない検証者XYZ");
    if (route.includes("predictions")) await page.getByRole("button", { name: "検索", exact: true }).click();
    if (route.includes("predictions")) await expect(page.locator("main").getByText("一致する予想者が見つかりません。名前を変えて検索してください。")).toBeVisible();
    await expect(page.locator("main table tbody td")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator("body")).not.toContainText("Something Went Wrong");
    expect(errors).toEqual([]);
    await testInfo.attach("legacy-mobile", { body: await page.screenshot(), contentType: "image/png" });
  });
}
