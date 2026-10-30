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
    // Same person + same picks is one row.
    const names = await board.locator(".sheet-row:not(.sheet-row-header):not(.sheet-row-actual) .sheet-name").allTextContents();
    expect(new Set(names).size).toBe(names.length);

    // Enter the actual standings as "my" prediction: expected 6 hits, 0 gap, 6×5 points.
    const actual = await board.locator(".sheet-row-actual .sheet-chip").evaluateAll((chips) => chips.map((c) => c.getAttribute("aria-label")!));
    expect(actual).toHaveLength(6);
    await page.getByPlaceholder("例：@アカウント名、ニックネーム").fill("@e2e_fan");
    const shortNames: Record<string, string> = { 阪神タイガース: "阪神", 読売ジャイアンツ: "巨人", 横浜DeNAベイスターズ: "DeNA", 広島東洋カープ: "広島", 中日ドラゴンズ: "中日", 東京ヤクルトスワローズ: "ヤクルト" };
    const teamButtons = page.getByRole("group", { name: "球団を順位の順に選ぶ" });
    for (const team of actual) await teamButtons.getByRole("button", { name: new RegExp(shortNames[team]) }).click();

    await expect(page.locator(".sheet-added")).toContainText("一覧に入りました：的中6・ずれ0・30点");
    const mine = board.locator(".sheet-row-mine");
    await expect(mine.locator(".sheet-name")).toContainText("@e2e_fan");
    // Entered after the results: never presented as a pre-season forecast.
    await expect(mine.locator(".sheet-name")).toContainText("結果確定後に入力");
    await expect(mine.locator(".sheet-metrics")).toContainText("6的中0ずれ30点");
    await page.getByRole("button", { name: "ずれ合計順" }).click();
    await expect(board.locator(".sheet-row:not(.sheet-row-header):not(.sheet-row-actual)").first()).toHaveClass(/sheet-row-mine/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.screenshot({ path: info.outputPath(`sheet-${width}.png`), fullPage: true });

    // A shared link reproduces the same sheet.
    await expect(page).toHaveURL(/me=%40e2e_fan/);
    await page.reload();
    await expect(board.locator(".sheet-row-mine .sheet-metrics")).toContainText("6的中0ずれ30点");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "一覧を画像で保存 ↓" }).click();
    expect((await download).suggestedFilename()).toBe("npb-2026-central-sheet.png");

    await context.route("https://x.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>x</p>" }));
    const popup = context.waitForEvent("page");
    await page.getByRole("button", { name: "Xで共有する" }).click();
    const intent = new URL((await popup).url());
    expect(intent.searchParams.get("text")).toContain("@e2e_fan 的中6・ずれ0・30点（結果確定後に入力）");
    expect(intent.searchParams.get("url")).toContain("order=");

    // The display name follows the visitor to the other league; picks start over.
    await page.getByRole("link", { name: "パ・リーグ" }).click();
    await expect(page.getByPlaceholder("例：@アカウント名、ニックネーム")).toHaveValue("@e2e_fan");
    await expect(page.locator(".sheet-row-mine")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
