import { describe, it, expect } from "vitest";
import {
  TEMPLATES,
  selectTemplate,
  renderTemplate,
  generateArticle,
  computeBoldness,
  getBoldnessLabel,
  getTimingLabel,
  getConsensusLabel,
  type ArticleTemplateVars,
} from "../article-templates";

// ---------------------------------------------------------------------------
// Template corpus
// ---------------------------------------------------------------------------

describe("TEMPLATES", () => {
  it("has at least 10 templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("each template has a unique id", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each template has headline and subtext containing at least one variable", () => {
    for (const t of TEMPLATES) {
      const combined = t.headline + t.subtext;
      expect(combined).toMatch(/\{[a-zA-Z1]+\}/);
    }
  });
});

// ---------------------------------------------------------------------------
// selectTemplate
// ---------------------------------------------------------------------------

describe("selectTemplate", () => {
  it("returns a template from the corpus", () => {
    const t = selectTemplate(4, 2026);
    expect(TEMPLATES).toContainEqual(t);
  });

  it("is deterministic (same userId + year = same template)", () => {
    const t1 = selectTemplate(4, 2026);
    const t2 = selectTemplate(4, 2026);
    expect(t1.id).toBe(t2.id);
  });

  it("different userId yields different template (usually)", () => {
    // Not guaranteed for all pairs, but highly likely for these
    const ids = new Set([1, 2, 3, 4, 5].map((id) => selectTemplate(id, 2026).id));
    expect(ids.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------

describe("renderTemplate", () => {
  const vars: ArticleTemplateVars = {
    name: "Tsuneshige",
    year: 2026,
    central1: "DeNA",
    pacific1: "日本ハム",
    boldness: "大穴狙い",
    timing: "開幕前の冷静な分析",
    consensus: "少数派の独自予想",
  };

  it("replaces all {var} placeholders", () => {
    const template = TEMPLATES[0]; // preseason-standard
    const result = renderTemplate(template, vars);
    expect(result.headline).not.toMatch(/\{[a-z]/);
    expect(result.subtext).not.toMatch(/\{[a-z]/);
  });

  it("includes the user name in output", () => {
    const template = TEMPLATES[0];
    const result = renderTemplate(template, vars);
    expect(result.headline).toContain("Tsuneshige");
  });

  it("includes the year in output", () => {
    const template = TEMPLATES[0];
    const result = renderTemplate(template, vars);
    expect(result.headline).toContain("2026");
  });
});

// ---------------------------------------------------------------------------
// generateArticle (convenience wrapper)
// ---------------------------------------------------------------------------

describe("generateArticle", () => {
  it("returns headline and subtext with all variables resolved", () => {
    const result = generateArticle(4, {
      name: "TestUser",
      year: 2026,
      central1: "巨人",
      pacific1: "ソフトバンク",
      boldness: "堅実派",
      timing: "開幕前の冷静な分析",
      consensus: "解説者の多数派と一致",
    });
    expect(result.headline).not.toMatch(/\{[a-z]/);
    expect(result.subtext).not.toMatch(/\{[a-z]/);
  });
});

// ---------------------------------------------------------------------------
// computeBoldness
// ---------------------------------------------------------------------------

describe("computeBoldness", () => {
  const allC = ["巨人", "巨人", "巨人", "阪神", "DeNA"];
  const allP = ["ソフトバンク", "ソフトバンク", "日本ハム", "ソフトバンク", "オリックス"];

  it("returns conservative when both picks match the mode", () => {
    expect(computeBoldness("巨人", "ソフトバンク", allC, allP)).toBe("conservative");
  });

  it("returns moderate when one pick matches the mode", () => {
    expect(computeBoldness("巨人", "日本ハム", allC, allP)).toBe("moderate");
  });

  it("returns bold or radical when neither matches the mode", () => {
    const level = computeBoldness("中日", "楽天", allC, allP);
    expect(["bold", "radical"]).toContain(level);
  });

  it("returns radical for extremely rare picks", () => {
    // Only 1 occurrence of each in a pool of 10
    const bigC = Array(10).fill("巨人");
    const bigP = Array(10).fill("ソフトバンク");
    bigC[9] = "ヤクルト";
    bigP[9] = "ロッテ";
    expect(computeBoldness("ヤクルト", "ロッテ", bigC, bigP)).toBe("radical");
  });
});

// ---------------------------------------------------------------------------
// Label functions
// ---------------------------------------------------------------------------

describe("getBoldnessLabel", () => {
  it("returns Japanese labels for each level", () => {
    expect(getBoldnessLabel("conservative")).toBe("堅実派");
    expect(getBoldnessLabel("moderate")).toBe("バランス型");
    expect(getBoldnessLabel("bold")).toBe("大穴狙い");
    expect(getBoldnessLabel("radical")).toBe("独自路線");
  });
});

describe("getTimingLabel", () => {
  it("returns preseason label for months 1-3", () => {
    expect(getTimingLabel(1)).toContain("開幕前");
    expect(getTimingLabel(3)).toContain("開幕前");
  });

  it("returns early season label for months 4-5", () => {
    expect(getTimingLabel(4)).toContain("序盤");
  });

  it("returns interleague label for months 6-7", () => {
    expect(getTimingLabel(6)).toContain("交流戦");
  });

  it("returns late season label for months 8-9", () => {
    expect(getTimingLabel(8)).toContain("終盤");
  });

  it("returns reflection label for months 10+", () => {
    expect(getTimingLabel(10)).toContain("振り返り");
  });
});

describe("getConsensusLabel", () => {
  it("returns majority-match for high agreement", () => {
    expect(getConsensusLabel(0.8)).toContain("多数派");
  });

  it("returns moderate for mid agreement", () => {
    expect(getConsensusLabel(0.5)).toContain("主流派");
  });

  it("returns minority for low agreement", () => {
    expect(getConsensusLabel(0.3)).toContain("少数派");
  });

  it("returns unique for very low agreement", () => {
    expect(getConsensusLabel(0.1)).toContain("独自");
  });
});
