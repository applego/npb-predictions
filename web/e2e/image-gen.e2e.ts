import { test, expect } from "@playwright/test";

// Verify OG image routes actually return PNG bytes, not HTML error pages.
// Uses userId=4 (Tsuneshige) which is seeded, or falls back to the first
// user returned by /api/users if available.

async function resolveSampleUserId(
  request: import("@playwright/test").APIRequestContext,
): Promise<number> {
  const fallback = 4;
  try {
    const res = await request.get("/api/users");
    if (res.ok()) {
      const data = (await res.json()) as Array<{ id: number }>;
      if (Array.isArray(data) && data.length > 0 && typeof data[0].id === "number") {
        return data[0].id;
      }
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

test.describe("OG image generation", () => {
  test("/api/og/prediction returns PNG for a valid user", async ({ request }) => {
    const userId = await resolveSampleUserId(request);
    const year = new Date().getFullYear();

    const res = await request.get(`/api/og/prediction?userId=${userId}&year=${year}`);
    expect(res.status(), "OG endpoint should not 5xx").toBeLessThan(500);

    const ct = res.headers()["content-type"] ?? "";
    expect(ct, `content-type should be image, got "${ct}"`).toMatch(/image\/(png|jpeg)/);

    const body = await res.body();
    // PNG magic bytes: 89 50 4E 47
    expect(body.length, "image body must be non-empty").toBeGreaterThan(100);
    if (ct.includes("png")) {
      expect(body[0]).toBe(0x89);
      expect(body[1]).toBe(0x50);
      expect(body[2]).toBe(0x4e);
      expect(body[3]).toBe(0x47);
    }
  });

  test("/api/og/[type] prediction format returns image (twitter size)", async ({
    request,
  }) => {
    const userId = await resolveSampleUserId(request);
    const year = new Date().getFullYear();

    const res = await request.get(
      `/api/og/prediction?type=prediction&userId=${userId}&year=${year}&format=twitter`,
    );
    expect(res.status()).toBeLessThan(500);
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/image\/(png|jpeg)/);
  });

  test("invalid userId returns fallback image, not 5xx", async ({ request }) => {
    const res = await request.get(`/api/og/prediction?userId=0`);
    expect(res.status()).toBeLessThan(500);
    // Fallback is still an image or a 200 with error-card image
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/image\/|text\//);
  });

  // 2026-05-23: regression guard — previously /api/og/season|commentator
  // returned 200 + 0B body when satori crashed mid-render on missing font.
  // Each route now must always emit a non-empty PNG.
  for (const route of ["season", "commentator", "standings"] as const) {
    test(`/api/og/${route} returns non-empty PNG`, async ({ request }) => {
      const userId = await resolveSampleUserId(request);
      const url =
        route === "standings"
          ? `/api/og/${route}`
          : `/api/og/${route}?userId=${userId}`;
      const res = await request.get(url);
      expect(res.status(), `${route} must not 5xx`).toBeLessThan(500);
      const ct = res.headers()["content-type"] ?? "";
      expect(ct).toMatch(/image\/(png|jpeg)/);
      const body = await res.body();
      expect(body.length, `${route} body must be non-empty`).toBeGreaterThan(
        100,
      );
      if (ct.includes("png")) {
        // PNG magic: 89 50 4E 47
        expect(body[0]).toBe(0x89);
        expect(body[1]).toBe(0x50);
      }
    });
  }

  // 2026-05-23: anti-fallback guard — empty / 1x1 / NPB-only default cards
  // are < 20KB. A real card with rendered Japanese typography + ranking rows
  // is >25KB. This catches the silent "PNG returned but it's the default
  // logo" regression that PR #6 left in place.
  test("/api/og/prediction returns REAL card (not default fallback)", async ({
    request,
  }) => {
    const userId = await resolveSampleUserId(request);
    const res = await request.get(`/api/og/prediction?userId=${userId}`);
    expect(res.status()).toBeLessThan(500);
    const body = await res.body();
    expect(
      body.length,
      "prediction must be the real newspaper card (>25KB), not the ASCII fallback",
    ).toBeGreaterThan(25_000);
  });
});
