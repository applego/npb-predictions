import { test, expect } from "@playwright/test";

// Archived 2026 results are bundled, so this journey does not depend on the database.
test.use({ baseURL: "http://localhost:3459" });

for (const width of [320, 390, 1400]) {
  test(`own prediction joins the commentator sheet and is shareable at ${width}px`, async ({ page, context }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => Object.defineProperty(navigator, "doNotTrack", { value: "1" }));
    await page.route("**/api/settings", (route) => route.fulfill({ json: {} }));
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

    await page.goto("/sheet?year=2026&league=central");
    await expect(page.getByRole("heading", { name: "順位予想一覧" })).toBeVisible();
    // While the root loading boundary streams in, React briefly keeps a hidden copy of the page
    // (<div hidden id="S:0">); only the visible board is what a visitor sees.
    const board = page.locator(".sheet-board:visible");
    const nameInput = page.getByLabel("表示名").filter({ visible: true });
    // Same person + same picks is one row.
    const names = await board.locator(".sheet-row:not(.sheet-row-header):not(.sheet-row-actual) .sheet-name").allTextContents();
    expect(new Set(names).size).toBe(names.length);

    // Enter the actual standings as "my" prediction: expected 6 hits, 0 gap, 6×5 points.
    const actual = await board.locator(".sheet-row-actual .sheet-chip").evaluateAll((chips) => chips.map((c) => c.getAttribute("aria-label")!));
    expect(actual).toHaveLength(6);
    await nameInput.fill("@e2e_fan");
    const shortNames: Record<string, string> = { 阪神タイガース: "阪神", 読売ジャイアンツ: "巨人", 横浜DeNAベイスターズ: "DeNA", 広島東洋カープ: "広島", 中日ドラゴンズ: "中日", 東京ヤクルトスワローズ: "ヤクルト" };
    const teamButtons = page.getByRole("group", { name: "球団を順位の順に選ぶ" });
    for (const team of actual) await teamButtons.getByRole("button", { name: new RegExp(shortNames[team]) }).click();

    await expect(page.locator(".sheet-chosen:visible")).toContainText("1位 " + shortNames[actual[0]]);
    await expect(page.locator(".sheet-added:visible")).toContainText("一覧に入りました：的中6・ずれ0・30点");
    const mine = board.locator(".sheet-row-mine");
    await expect(mine.locator(".sheet-name")).toContainText("@e2e_fan");
    // Entered with no recorded date: reference only, never ranked above a commentator even with a perfect score.
    await expect(mine.locator(".sheet-name")).toContainText("参考・順位の対象外");
    await expect(mine.locator(".sheet-metrics")).toContainText("6的中0ずれ30点");
    const ranked = board.locator(".sheet-row:not(.sheet-row-header):not(.sheet-row-actual)");
    for (const sort of ["点数順", "的中数順", "ずれ合計順"]) {
      await page.getByRole("button", { name: sort }).click();
      await expect(ranked.last()).toHaveClass(/sheet-row-mine/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.screenshot({ path: info.outputPath(`sheet-${width}.png`), fullPage: true });


    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "一覧を画像で保存 ↓" }).click();
    expect((await download).suggestedFilename()).toBe("npb-2026-central-sheet.png");

    await context.route("https://x.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>x</p>" }));
    const popup = context.waitForEvent("page");
    await page.getByRole("button", { name: "Xで共有する" }).click();
    const intent = new URL((await popup).url());
    // The display name never becomes a mention of a real X account.
    expect(intent.searchParams.get("text")).toContain("＠e2e_fan 的中6・ずれ0・30点（参考：入力日の記録なし・順位の対象外）");
    expect(intent.searchParams.get("text")).not.toContain("@");
    expect(intent.searchParams.get("url")).toContain("order=");

    // The display name follows the visitor to the other league; picks start over.
    const sharedUrl = page.url();
    await page.getByRole("link", { name: "パ・リーグ" }).click();
    await expect(nameInput).toHaveValue("@e2e_fan");
    await expect(board.locator(".sheet-row-mine")).toHaveCount(0);

    // Someone opening the shared link sees that person's row, not a row labelled as their own.
    await page.goto(sharedUrl);
    const sharedRow = board.locator(".sheet-row-shared");
    await expect(sharedRow.locator(".sheet-name")).toContainText("@e2e_fanさん");
    await expect(sharedRow.locator(".sheet-metrics")).toContainText("6的中0ずれ30点");
    await expect(nameInput).toHaveValue("");
    await expect(page.locator(".sheet-added:visible")).toHaveCount(0);
    await expect(board.locator(".sheet-row-mine")).toHaveCount(0);
    // The sender reopening their own link can take the row back to edit it.
    await page.getByRole("button", { name: "自分の予想として直す" }).click();
    await expect(nameInput).toHaveValue("@e2e_fan");
    await expect(board.locator(".sheet-row-mine .sheet-metrics")).toContainText("6的中0ずれ30点");
    await expect(board.locator(".sheet-row-shared")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
