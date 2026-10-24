import { test, expect, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function contrast(locator: Locator) {
  return locator.evaluate(element => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    const rgba = (value: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    const layers: number[][] = [];
    for (let el: Element | null = element; el; el = el.parentElement) layers.unshift(rgba(getComputedStyle(el).backgroundColor));
    let bg = [255, 255, 255];
    for (const layer of layers) bg = bg.map((v, i) => layer[i] * layer[3] / 255 + v * (1 - layer[3] / 255));
    const fg = rgba(getComputedStyle(element).color);
    const rgb = bg.map((v, i) => fg[i] * fg[3] / 255 + v * (1 - fg[3] / 255));
    const luminance = (values: number[]) => values.map(v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(bg), b = luminance(rgb);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

for (const width of [320, 390, 1400]) {
  test(`comparison year and PNG controls remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Measure the text actually drawn to the downloaded canvas, including transforms.
    await page.addInitScript(() => {
      const drawn: { text: string; left: number; right: number; y: number; width: number }[] = [];
      Object.assign(window, { comparisonDrawnText: drawn });
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
        const scale = this.getTransform().a;
        const width = this.measureText(text).width;
        const left = this.textAlign === "right" ? x - width : this.textAlign === "center" ? x - width / 2 : x;
        drawn.push({ text, left: left * scale, right: (left + width) * scale, y: y * scale, width: this.canvas.width });
        if (maxWidth === undefined) original.call(this, text, x, y);
        else original.call(this, text, x, y, maxWidth);
      };
    });
    const errors: string[] = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/settings", route => route.fulfill({ json: {} }));
    await page.route("**/api/likes/123456", route => route.fulfill({ json: { userId: 123456, count: 0 } }));
    let delayOld = false;
    let releaseOld!: () => void;
    let oldStarted!: () => void;
    let oldFinished!: () => void;
    const barrier = new Promise<void>(resolve => { releaseOld = resolve; });
    const started = new Promise<void>(resolve => { oldStarted = resolve; });
    const finished = new Promise<void>(resolve => { oldFinished = resolve; });
    const requests: number[] = [];
    await page.route("**/api/rankings/commentators?*", async route => {
      const year = Number(new URL(route.request().url()).searchParams.get("year")); requests.push(year);
      const held = delayOld && year === 2025;
      if (held) { oldStarted(); await barrier; }
      await route.fulfill({ json: {
        season: { id: year, year }, league: "all", actualCentral: [], actualPacific: [], totalCommentators: 1,
        commentators: [{ userId: 123456, name: `比較検証${year}`, slug: "comparison-fixture", source: null, sourceUrl: null, variant: null,
          centralScore: 5, pacificScore: 0, rankingScore: 5, titleScore: 0, totalScore: 5, effectiveTotal: 5, rank: 1,
          centralDetails: [{ rank: 1, predictedTeam: "阪神タイガース", actualTeam: "阪神タイガース", actualRank: 1, diff: 0, score: 5 }], pacificDetails: [] }],
      } });
      if (held) oldFinished();
    });
    await page.goto("/rankings/commentators");
    const year = page.getByRole("combobox", { name: "年度", exact: true });
    await expect(year).toHaveValue("2026");
    await expect(year).toBeInViewport({ ratio: 1 });
    const box = await year.boundingBox(); expect(box!.width).toBeLessThanOrEqual(width); expect(box!.height).toBeGreaterThanOrEqual(44);
    await year.selectOption("2025");
    await expect(page.getByText("比較検証2025", { exact: true })).toBeVisible(); expect(requests).toContain(2025);
    await year.selectOption("2026");
    await expect(page.getByText("比較検証2026", { exact: true })).toBeVisible();
    delayOld = true;
    await year.selectOption("2025"); await started;
    await year.selectOption("2026");
    await expect(page.getByText("比較検証2026", { exact: true })).toBeVisible();
    releaseOld(); await finished;
    // Flush browser rendering after the deliberately late response; no timer-based assertion.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.getByText("比較検証2026", { exact: true })).toBeVisible();
    await expect(page.getByText("比較検証2025", { exact: true })).toHaveCount(0);
    for (const name of ["セのみ", "名前順"]) {
      const button = page.getByRole("button", { name, exact: true }); await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      expect(await contrast(button), name).toBeGreaterThanOrEqual(4.5);
    }
    await expect(page.getByText("比較検証2026", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "📰 新聞PNG", exact: true }).click();
    const download = page.getByRole("button", { name: "↓ PNG ダウンロード (1列)", exact: true });
    await download.scrollIntoViewIfNeeded(); await expect(download).toBeInViewport({ ratio: 1 });
    expect(await contrast(download), "PNG action").toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.screenshot({ path: test.info().outputPath(`comparison-png-${width}.png`) });
    const pending = page.waitForEvent("download"); await download.click(); const file = await pending;
    const bytes = await readFile((await file.path())!); expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBeGreaterThan(0); expect(bytes.readUInt32BE(20)).toBeGreaterThan(0);
    await file.saveAs(test.info().outputPath(`comparison-${width}.png`));
    const text = await page.evaluate(() => (window as unknown as { comparisonDrawnText: { text: string; left: number; right: number; y: number; width: number }[] }).comparisonDrawnText);
    for (const prefix of ["NPB 2026 セ・リーグ 順位予想", "npb-predictions.pages.dev"]) {
      const draw = text.find(t => t.text.startsWith(prefix)); expect(draw).toBeDefined();
      expect(draw!.left).toBeGreaterThanOrEqual(0); expect(draw!.right).toBeLessThanOrEqual(draw!.width);
    }
    const leagueText = text.find(t => t.text === "セ・リーグ")!;
    const dateText = text.find(t => t.text.endsWith(" 作成"))!;
    expect(leagueText.y).toBe(dateText.y); expect(leagueText.right).toBeLessThan(dateText.left);
    await year.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`comparison-year-${width}.png`) });
    expect(errors).toEqual([]);
  });
}
