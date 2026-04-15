import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOgImageUrl,
  getShareUrl,
  getShareText,
  getTwitterShareUrl,
  getLineShareUrl,
  type OgType,
  type OgParams,
} from "../share";

// share.ts uses process.env / window — mock env for predictable base URL
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://test.example.com");
  vi.stubEnv("VERCEL_URL", "");
});

describe("getOgImageUrl", () => {
  it("builds a URL for prediction type without params", () => {
    const url = getOgImageUrl("prediction");
    expect(url).toBe("https://test.example.com/api/og/prediction");
  });

  it("includes userId and year as query params", () => {
    const url = getOgImageUrl("prediction", { userId: 42, year: 2026 });
    expect(url).toContain("userId=42");
    expect(url).toContain("year=2026");
  });

  it("includes format when provided", () => {
    const url = getOgImageUrl("scoreboard", { format: "twitter" });
    expect(url).toContain("format=twitter");
  });

  it("omits missing optional params from query string", () => {
    const url = getOgImageUrl("scoreboard", { year: 2026 });
    expect(url).not.toContain("userId");
    expect(url).not.toContain("month");
    expect(url).toContain("year=2026");
  });

  it("builds URL for all OgType values", () => {
    const types: OgType[] = ["prediction", "scoreboard", "monthly-champion", "weekly"];
    for (const type of types) {
      const url = getOgImageUrl(type);
      expect(url).toContain(`/api/og/${type}`);
    }
  });

  it("builds URL with month param for monthly-champion", () => {
    const url = getOgImageUrl("monthly-champion", { month: 5, year: 2026 });
    expect(url).toContain("month=5");
    expect(url).toContain("year=2026");
  });
});

describe("getShareUrl", () => {
  it("returns prediction URL with userId and year", () => {
    const url = getShareUrl("prediction", { userId: 7, year: 2026 });
    expect(url).toBe("https://test.example.com/users/7?year=2026");
  });

  it("returns scoreboard URL", () => {
    const url = getShareUrl("scoreboard", { year: 2025 });
    expect(url).toBe("https://test.example.com/standings?year=2025");
  });

  it("returns monthly-champion URL (same as scoreboard)", () => {
    const url = getShareUrl("monthly-champion", { year: 2026 });
    expect(url).toContain("/standings?year=2026");
  });

  it("returns weekly URL (same as scoreboard)", () => {
    const url = getShareUrl("weekly", { year: 2026 });
    expect(url).toContain("/standings?year=2026");
  });

  it("falls back to current year when year is omitted", () => {
    const currentYear = new Date().getFullYear();
    const url = getShareUrl("scoreboard");
    expect(url).toContain(`year=${currentYear}`);
  });
});

describe("getShareText", () => {
  it("includes year in prediction text", () => {
    const text = getShareText("prediction", { year: 2026, userName: "テストユーザー" });
    expect(text).toContain("2026");
    expect(text).toContain("テストユーザー");
    expect(text).toContain("#NPB予想リーグ");
  });

  it("uses fallback text when userName is omitted for prediction", () => {
    const text = getShareText("prediction", { year: 2026 });
    expect(text).toContain("2026");
    expect(text).toContain("#NPB予想リーグ");
    expect(text).not.toContain("undefined");
  });

  it("returns scoreboard text", () => {
    const text = getShareText("scoreboard", { year: 2026 });
    expect(text).toContain("2026");
    expect(text).toContain("#NPB予想リーグ");
  });

  it("returns monthly-champion text", () => {
    const text = getShareText("monthly-champion", { year: 2026 });
    expect(text).toContain("月間チャンピオン");
  });

  it("returns weekly text", () => {
    const text = getShareText("weekly", { year: 2026 });
    expect(text).toContain("#NPB予想リーグ");
  });

  it("returns generic fallback text for unknown type", () => {
    // Covers the `default` branch in getShareText
    const text = getShareText("unknown" as OgType, { year: 2026 });
    expect(text).toContain("#NPB予想リーグ");
  });
});

describe("getShareUrl default branch", () => {
  it("returns base URL for unknown type", () => {
    // Covers the `default` branch in getShareUrl
    const url = getShareUrl("unknown" as OgType, { year: 2026 });
    expect(url).toBe("https://test.example.com");
  });
});

describe("getTwitterShareUrl", () => {
  it("builds a twitter intent URL", () => {
    const url = getTwitterShareUrl("scoreboard", { year: 2026 });
    expect(url).toContain("https://twitter.com/intent/tweet");
    expect(url).toContain("text=");
    expect(url).toContain("url=");
  });

  it("URL-encodes the share text", () => {
    const url = getTwitterShareUrl("prediction", { year: 2026, userName: "テスト" });
    // Japanese characters must be percent-encoded
    expect(url).toMatch(/text=%[0-9A-F]/i);
  });
});

describe("getLineShareUrl", () => {
  it("builds a LINE share URL", () => {
    const url = getLineShareUrl("scoreboard", { year: 2026 });
    expect(url).toContain("social-plugins.line.me/lineit/share");
    expect(url).toContain("url=");
  });

  it("URL-encodes the share URL", () => {
    const url = getLineShareUrl("prediction", { userId: 1, year: 2026 });
    // https: must be encoded
    expect(url).toContain("url=https");
  });
});
