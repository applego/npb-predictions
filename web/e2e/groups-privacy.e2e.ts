import { test, expect } from "@playwright/test";

test.describe("Groups privacy", () => {
  test("group detail API requires a verified member session", async ({ request }) => {
    const res = await request.get("/api/groups/core-five");
    expect(res.status()).toBe(401);
    const data = (await res.json()) as { error?: string };
    expect(data.error).toMatch(/Unauthorized/i);
  });

  test("unauthenticated visitors see login gate instead of group contents", async ({
    page,
  }) => {
    const res = await page.goto("/groups/core-five");
    expect(res?.status(), "/groups/core-five must not 5xx").toBeLessThan(500);
    await page.waitForLoadState("networkidle");

    const body = (await page.textContent("body")) ?? "";
    expect(body).toContain("グループを見るにはログインが必要です");
    expect(body).not.toContain("CORE5X");
  });
});
