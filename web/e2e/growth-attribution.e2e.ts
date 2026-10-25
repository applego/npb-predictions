import { expect, test } from "@playwright/test";

test("X result attribution survives navigation and an open tab counts again next UTC day", async ({ page }) => {
  const events: Array<{ event: string; source: string; session: string }> = [];
  await page.route("**/api/growth/events", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.clock.install({ time: new Date("2026-10-25T23:50:00Z") });
  await page.goto("/rankings?year=2026&league=central&utm_source=x");
  await expect.poll(() => events.length).toBe(1);
  expect(events[0]).toMatchObject({ event: "result_view", source: "x" });
  await page.goto("/rankings?year=2026&league=pacific");
  await expect.poll(() => events.length).toBe(2);
  expect(events[1]).toMatchObject({ event: "result_view", source: "x", session: events[0].session });
  await page.clock.setFixedTime(new Date("2026-10-26T00:01:00Z"));
  await page.reload();
  await expect.poll(() => events.length).toBe(3);
  expect(events[2]).toMatchObject({ event: "result_view", source: "x", session: events[0].session });
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(events).toHaveLength(3);
});
