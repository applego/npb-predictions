import { describe, it, expect } from "vitest";

// Source normalization and validation rules

export const KNOWN_MEDIA: Record<string, string> = {
  // Newspapers (新聞)
  "日刊スポーツ": "新聞",
  "スポニチ": "新聞",
  "サンスポ": "新聞",
  "サンケイスポーツ": "新聞",
  "デイリー": "新聞",
  "デイリースポーツ": "新聞",
  "スポーツ報知": "新聞",
  "報知": "新聞",
  "東京スポーツ": "新聞",
  "中日スポーツ": "新聞",
  "西日本スポーツ": "新聞",
  "夕刊フジ": "新聞",
  "産経": "新聞",
  "産経新聞": "新聞",
  "朝日": "新聞",
  "朝日新聞": "新聞",
  "読売": "新聞",
  "日経": "新聞",
  // Magazines (雑誌)
  "週刊ベースボール": "雑誌",
  "週ベ": "雑誌",
  "週べ": "雑誌",
  "週刊ポスト": "雑誌",
  "週刊大衆": "雑誌",
  "Number": "雑誌",
  "AERA": "雑誌",
  // TV (テレビ)
  "日本テレビ": "テレビ",
  "日テレ": "テレビ",
  "TBS": "テレビ",
  "テレビ朝日": "テレビ",
  "フジテレビ": "テレビ",
  "テレビ東京": "テレビ",
  "NHK": "テレビ",
  "関西テレビ": "テレビ",
  "関テレ": "テレビ",
  "ABC": "テレビ",
  "朝日放送": "テレビ",
  "MBS": "テレビ",
  "CBC": "テレビ",
  "東海テレビ": "テレビ",
  "名古屋テレビ": "テレビ",
  "中京テレビ": "テレビ",
  "RCC": "テレビ",
  "サンテレビ": "テレビ",
  "仙台放送": "テレビ",
  "テレ玉": "テレビ",
  "BS": "テレビ",
  "スカパー": "テレビ",
  "プロ野球ニュース": "テレビ",
  // Radio (ラジオ)
  "文化放送": "ラジオ",
  "ニッポン放送": "ラジオ",
  "ラジオ大阪": "ラジオ",
  "MBSラジオ": "ラジオ",
  "ABCラジオ": "ラジオ",
  "STVラジオ": "ラジオ",
  "HBCラジオ": "ラジオ",
  "CBCラジオ": "ラジオ",
  // Web/YouTube
  "YouTube": "YouTube",
  "web Sportiva": "Web",
  "Sportiva": "Web",
  "SPAIA": "Web",
  "Full-Count": "Web",
  "FullC": "Web",
  "HOMINIS": "Web",
  "Yahoo!": "Web",
  "カナコロ": "Web",
  "ガッツリ": "Web",
};

/**
 * Extract media category from a source string
 */
export function categorizeSource(source: string | null): string | null {
  if (!source) return null;
  for (const [prefix, category] of Object.entries(KNOWN_MEDIA)) {
    if (source.includes(prefix)) return category;
  }
  // Direct category matches
  if (["新聞", "テレビ", "ラジオ", "雑誌", "Web", "YouTube"].includes(source)) return source;
  return null;
}

/**
 * Extract date from source string like "3/25 日刊スポーツ" or "デイリースポーツ(3/27"
 */
export function extractDateFromSource(source: string | null): { month: number; day: number } | null {
  if (!source) return null;
  // Pattern: M/DD at start or in parentheses
  const m = source.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

// ── Tests ──

describe("categorizeSource", () => {
  it("categorizes newspapers", () => {
    expect(categorizeSource("日刊スポーツ")).toBe("新聞");
    expect(categorizeSource("3/25 スポニチ")).toBe("新聞");
    expect(categorizeSource("デイリースポーツ(3/27")).toBe("新聞");
    expect(categorizeSource("中日スポーツ(6/16")).toBe("新聞");
  });

  it("categorizes magazines", () => {
    expect(categorizeSource("週刊ベースボール")).toBe("雑誌");
    expect(categorizeSource("3/22 週刊ポスト")).toBe("雑誌");
  });

  it("categorizes TV", () => {
    expect(categorizeSource("日本テレビ")).toBe("テレビ");
    expect(categorizeSource("NHK(3/17")).toBe("テレビ");
    expect(categorizeSource("関西テレビ(3/24")).toBe("テレビ");
  });

  it("categorizes YouTube", () => {
    expect(categorizeSource("YouTube")).toBe("YouTube");
    expect(categorizeSource("YouTube(3/24")).toBe("YouTube");
  });

  it("categorizes Web", () => {
    expect(categorizeSource("web Sportiva(3/25")).toBe("Web");
    expect(categorizeSource("SPAIA(3/26")).toBe("Web");
  });

  it("handles direct categories", () => {
    expect(categorizeSource("新聞")).toBe("新聞");
    expect(categorizeSource("テレビ")).toBe("テレビ");
  });

  it("returns null for unknown", () => {
    expect(categorizeSource("阪神担当")).toBeNull();
    expect(categorizeSource(null)).toBeNull();
  });
});

describe("extractDateFromSource", () => {
  it("extracts date from M/DD format", () => {
    expect(extractDateFromSource("3/25 日刊スポーツ")).toEqual({ month: 3, day: 25 });
    expect(extractDateFromSource("デイリースポーツ(3/27")).toEqual({ month: 3, day: 27 });
    expect(extractDateFromSource("12/31発売")).toEqual({ month: 12, day: 31 });
  });

  it("returns null for no date", () => {
    expect(extractDateFromSource("新聞")).toBeNull();
    expect(extractDateFromSource(null)).toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(extractDateFromSource("13/40")).toBeNull();
    expect(extractDateFromSource("0/5")).toBeNull();
  });
});

describe("KNOWN_MEDIA coverage", () => {
  it("has all major sports newspapers", () => {
    const papers = Object.entries(KNOWN_MEDIA).filter(([, v]) => v === "新聞").map(([k]) => k);
    expect(papers).toContain("日刊スポーツ");
    expect(papers).toContain("スポニチ");
    expect(papers).toContain("サンスポ");
    expect(papers).toContain("デイリースポーツ");
    expect(papers).toContain("スポーツ報知");
    expect(papers).toContain("東京スポーツ");
    expect(papers).toContain("中日スポーツ");
  });

  it("has all major TV networks", () => {
    const tv = Object.entries(KNOWN_MEDIA).filter(([, v]) => v === "テレビ").map(([k]) => k);
    expect(tv).toContain("日本テレビ");
    expect(tv).toContain("TBS");
    expect(tv).toContain("NHK");
    expect(tv).toContain("フジテレビ");
  });
});
