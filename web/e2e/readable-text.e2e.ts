import { expect, test, type Page } from "@playwright/test";

// Old dark-theme colors (e.g. rgba(255,255,255,0.75)) left on the light theme
// made commentator picks invisible. Check the rendered text, not the source.
async function lowContrastTexts(page: Page, minRatio: number) {
  return page.evaluate((min) => {
    // Let the browser resolve any CSS color syntax (rgb, oklch, ...) to RGBA.
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    const parse = (value: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, alpha] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a: alpha / 255 };
    };
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const channel = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const backgroundOf = (el: Element | null) => {
      for (let node = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== "none") return null; // gradients/images: skip
        const bg = parse(style.backgroundColor);
        if (bg && bg.a > 0.5) return bg;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const failures: string[] = [];
    const walker = document.createTreeWalker(document.querySelector("main") ?? document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const el = node.parentElement;
      if (!text || !el || !el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) continue;
      const fg = parse(getComputedStyle(el).color);
      const bg = backgroundOf(el);
      if (!fg || !bg) continue;
      // Blend translucent text over its background before comparing.
      const blended = {
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
      };
      const [hi, lo] = [luminance(blended), luminance(bg)].sort((x, y) => y - x);
      const ratio = (hi + 0.05) / (lo + 0.05);
      if (ratio < min) failures.push(`${text.slice(0, 20)} (${ratio.toFixed(2)})`);
    }
    return failures;
  }, minRatio);
}

test("commentator detail shows readable picks", async ({ page }) => {
  // Same path a visitor takes: result ranking → "この人の成績を見る".
  await page.goto(`/rankings?year=2026&league=central&q=${encodeURIComponent("検証用 解説者A")}`);
  const link = page.locator('main a[href^="/users/"]').filter({ hasText: "この人の成績を見る" }).first();
  await page.goto((await link.getAttribute("href"))!);
  await expect(page.getByRole("cell", { name: /タイガース|ジャイアンツ|ホークス|ファイターズ/ }).first()).toBeVisible();
  expect(await lowContrastTexts(page, 3)).toEqual([]);
});

test("scoreboard trend keeps rank cells readable", async ({ page }) => {
  await page.goto("/rankings/scoreboard?year=2026&view=trend");
  await page.waitForLoadState("networkidle");
  expect(await lowContrastTexts(page, 3)).toEqual([]);
});
