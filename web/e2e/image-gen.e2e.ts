import { test, expect } from "@playwright/test";

// Verify OG image routes actually return PNG bytes with correct dimensions —
// not HTML error pages, not stub bodies, not text fallbacks.

const TWITTER_DIMS = { width: 1200, height: 630 };

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

// Parse a PNG IHDR chunk to read width/height. Throws if buffer is not a PNG.
// PNG layout: 8-byte signature, then IHDR chunk starting at byte 8.
//   bytes 16-19 = width  (big-endian uint32)
//   bytes 20-23 = height (big-endian uint32)
function parsePngDimensions(buf: Buffer): { width: number; height: number } {
  if (buf.length < 24) throw new Error(`PNG too short: ${buf.length} bytes`);
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error(
      `not a PNG (header=${buf.subarray(0, 4).toString("hex")})`,
    );
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

test.describe("OG image generation", () => {
  test("/api/og/prediction returns a real PNG of correct size for a valid user", async ({
    request,
  }) => {
    const userId = await resolveSampleUserId(request);
    const year = new Date().getFullYear();

    const res = await request.get(`/api/og/prediction?userId=${userId}&year=${year}`);
    expect(res.status(), "OG endpoint must succeed").toBe(200);

    const ct = res.headers()["content-type"] ?? "";
    expect(ct, `content-type must be image/png, got "${ct}"`).toMatch(/image\/png/);

    const body = await res.body();
    // A real OG card is well above 1KB; a stub or fallback would be much smaller.
    expect(
      body.length,
      "PNG body must be a non-trivial image (>1KB)",
    ).toBeGreaterThan(1024);

    // Magic bytes must be PNG.
    expect(body[0]).toBe(0x89);
    expect(body[1]).toBe(0x50);
    expect(body[2]).toBe(0x4e);
    expect(body[3]).toBe(0x47);

    // Dimensions must match the OGP standard (1200x630).
    const dims = parsePngDimensions(body);
    expect(dims).toEqual(TWITTER_DIMS);
  });

  test("/api/og/[type] dynamic route returns a twitter-sized PNG for scoreboard", async ({
    request,
  }) => {
    const year = new Date().getFullYear();

    // The previous version of this test pointed at /api/og/prediction, which
    // is the *static* prediction route — so it never exercised the dynamic
    // [type] handler. Hit a non-prediction type to actually go through
    // src/app/api/og/[type]/route.tsx.
    const res = await request.get(
      `/api/og/scoreboard?year=${year}&format=twitter`,
    );
    expect(res.status(), "[type] OG endpoint must succeed").toBe(200);

    const ct = res.headers()["content-type"] ?? "";
    expect(ct, `[type] content-type must be image/png, got "${ct}"`).toMatch(
      /image\/png/,
    );

    const body = await res.body();
    expect(body.length).toBeGreaterThan(1024);
    const dims = parsePngDimensions(body);
    expect(dims).toEqual(TWITTER_DIMS);
  });

  test("invalid userId still returns a real PNG fallback (never HTML or 5xx)", async ({
    request,
  }) => {
    const res = await request.get(`/api/og/prediction?userId=0`);
    expect(res.status(), "fallback must not 5xx").toBe(200);

    const ct = res.headers()["content-type"] ?? "";
    // The fallback must remain a real image — accepting text/* would let a
    // crash leak through as an OK response.
    expect(ct, `fallback must be image, got "${ct}"`).toMatch(/image\/png/);

    const body = await res.body();
    expect(body.length).toBeGreaterThan(1024);
    expect(body[0]).toBe(0x89);
    expect(body[1]).toBe(0x50);
    expect(body[2]).toBe(0x4e);
    expect(body[3]).toBe(0x47);
    const dims = parsePngDimensions(body);
    expect(dims.width).toBeGreaterThanOrEqual(600);
    expect(dims.height).toBeGreaterThanOrEqual(300);
  });
});
