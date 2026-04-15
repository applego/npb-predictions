import { describe, it, expect } from "vitest";
import { FONT_PRESETS, getPreset } from "../font-presets";

describe("FONT_PRESETS", () => {
  it("has at least 4 presets", () => {
    expect(FONT_PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it("each preset has required fields", () => {
    for (const p of FONT_PRESETS) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.display).toBeTruthy();
      expect(p.body).toBeTruthy();
      expect(p.googleFontsQuery).toContain("family=");
    }
  });

  it("ids are unique", () => {
    const ids = FONT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getPreset returns correct preset", () => {
    expect(getPreset("B").label).toBe("Sport");
  });

  it("getPreset falls back to first for unknown id", () => {
    expect(getPreset("ZZZZZ").id).toBe(FONT_PRESETS[0].id);
  });
});
