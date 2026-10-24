import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3459" });
for (const width of [320,390,1400]) {
  test(`result metrics and actual share card work at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height:900 });
    await page.addInitScript(() => Object.defineProperty(navigator,"doNotTrack",{value:"1"}));
    await page.route("**/api/settings", route => route.fulfill({json:{}}));
    const errors: string[]=[]; page.on("pageerror", e=>errors.push(e.message));
    page.on("console", m=>{ if(m.type()==="error") errors.push(m.text()); });
    await page.goto("/rankings?year=2026&league=central");
    await expect(page.getByRole("heading",{name:"解説者の予想ランキング"})).toBeVisible();
    await page.screenshot({path:info.outputPath(`overview-${width}.png`)});
    const group=page.getByRole("group",{name:"ランキングの評価指標"});
    for(const [name,key,selector,direction] of [["順位予想点","points",".result-points b",-1],["一致数","exact",".result-match b",-1],["順位差","deviation",".result-deviation b",1]] as const){
      const button=group.getByRole("button",{name:new RegExp(`^${name}`)});await button.click();
      await expect(button).toHaveAttribute("aria-pressed","true");await expect(page).toHaveURL(new RegExp(`sort=${key}`));
      const values=await page.locator(`main .result-person ${selector}`).allTextContents();
      const numbers=values.map(x=>parseInt(x));expect(numbers.length).toBeGreaterThan(1);
      for(let i=1;i<numbers.length;i++) expect((numbers[i]-numbers[i-1])*direction).toBeGreaterThanOrEqual(0);
    }
    await page.reload();await expect(group.getByRole("button",{name:/^順位差/})).toHaveAttribute("aria-pressed","true");
    await group.getByRole("button",{name:/^順位予想点/}).click();
    const first=page.locator("main .result-person").first();await first.scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath(`ranking-${width}.png`)});
    await first.locator("summary").click();await expect(first.locator("tbody tr")).toHaveCount(6);
    const downloadPromise=page.waitForEvent("download");await first.getByRole("button",{name:"結果カードを画像で保存 ↓"}).click();
    await (await downloadPromise).saveAs(info.outputPath(`share-central-${width}.png`));
    await first.screenshot({path:info.outputPath(`detail-${width}.png`)});
    const intent=new URL((await first.getByRole("link",{name:"この結果をXで共有する"}).getAttribute("href"))!);
    expect(intent.searchParams.get("text")).toContain("順位予想");expect(intent.searchParams.get("url")).toContain("sort=points");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
    expect(errors).toEqual([]);
  });
  test(`combined share card preserves twelve picks at ${width}px`, async ({page},info) => {
    await page.setViewportSize({width,height:900});
    await page.addInitScript(() => Object.defineProperty(navigator,"doNotTrack",{value:"1"}));
    await page.route("**/api/settings",route=>route.fulfill({json:{}}));
    const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type()==="error") errors.push(message.text());});
    await page.goto("/rankings?year=2026&league=all&sort=exact");
    await expect(page.getByRole("group",{name:"ランキングの評価指標"}).getByRole("button",{name:/^一致数/})).toHaveAttribute("aria-pressed","true");
    const both=page.locator("main .result-person").first();await both.locator("summary").click();
    await expect(both.locator("tbody tr")).toHaveCount(12);
    const bothDownload=page.waitForEvent("download");await both.getByRole("button",{name:"結果カードを画像で保存 ↓"}).click();
    await (await bothDownload).saveAs(info.outputPath(`share-all-${width}.png`));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
    expect(errors).toEqual([]);
  });
}
