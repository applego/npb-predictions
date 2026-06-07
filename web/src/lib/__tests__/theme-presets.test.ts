import { describe, it, expect } from "vitest";
import {
  DEFAULT_COLOR_THEME_ID,
  NUMBER_FONTS, BODY_FONTS, COLOR_THEMES,
  getNumberFont, getBodyFont, getColorTheme,
  buildGoogleFontsUrl,
} from "../theme-presets";

describe("NUMBER_FONTS", () => {
  it("has at least 5 options", () => {
    expect(NUMBER_FONTS.length).toBeGreaterThanOrEqual(5);
  });

  it("each font has required fields", () => {
    for (const f of NUMBER_FONTS) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.family).toBeTruthy();
      expect(f.googleQuery).toContain("family=");
    }
  });

  it("ids are unique", () => {
    const ids = NUMBER_FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("BODY_FONTS", () => {
  it("has at least 4 options", () => {
    expect(BODY_FONTS.length).toBeGreaterThanOrEqual(4);
  });

  it("each font has required fields", () => {
    for (const f of BODY_FONTS) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.family).toBeTruthy();
      expect(f.googleQuery).toContain("family=");
    }
  });

  it("ids are unique", () => {
    const ids = BODY_FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("COLOR_THEMES", () => {
  const REQUIRED_VARS = [
    "--bg-base", "--bg-surface", "--bg-elevated", "--bg-inset",
    "--border-primary", "--text-primary", "--text-secondary", "--text-muted",
    "--stitch", "--field", "--dirt",
  ];

  it("has at least 3 themes", () => {
    expect(COLOR_THEMES.length).toBeGreaterThanOrEqual(3);
  });

  it("each theme has all required CSS variables", () => {
    for (const theme of COLOR_THEMES) {
      for (const v of REQUIRED_VARS) {
        expect(theme.vars[v], `${theme.id} missing ${v}`).toBeTruthy();
      }
    }
  });

  it("ids are unique", () => {
    const ids = COLOR_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("baseball theme remains available as the clean light theme", () => {
    const bb = COLOR_THEMES.find((t) => t.id === "baseball");
    expect(bb).toBeTruthy();
    expect(bb!.vars["--bg-base"]).toBe("#FAFAFA");
  });

  it("release default theme is the finalized editorial direction", () => {
    const theme = COLOR_THEMES.find((t) => t.id === DEFAULT_COLOR_THEME_ID);
    expect(theme).toBeTruthy();
    expect(theme!.id).toBe("editorial-navy-ivory");
    expect(theme!.description).toContain("日本野球伝統色");
  });

  it("stadium theme is the dark theme", () => {
    const st = COLOR_THEMES.find((t) => t.id === "stadium");
    expect(st).toBeTruthy();
    expect(st!.vars["--bg-base"]).toBe("#040912");
  });
});

describe("getters", () => {
  it("getNumberFont returns correct font", () => {
    expect(getNumberFont("oswald").name).toBe("Oswald");
  });

  it("getNumberFont falls back to first", () => {
    expect(getNumberFont("nonexistent").id).toBe(NUMBER_FONTS[0].id);
  });

  it("getBodyFont returns correct font", () => {
    expect(getBodyFont("zen").name).toBe("Zen Kaku Gothic New");
  });

  it("getBodyFont falls back to first for unknown id", () => {
    expect(getBodyFont("nonexistent").id).toBe(BODY_FONTS[0].id);
  });

  it("getColorTheme returns correct theme", () => {
    expect(getColorTheme("night").name).toBe("Night Game");
  });

  it("getColorTheme falls back to first for unknown id", () => {
    expect(getColorTheme("nonexistent").id).toBe(COLOR_THEMES[0].id);
  });
});

describe("buildGoogleFontsUrl", () => {
  it("combines number and body font queries", () => {
    const url = buildGoogleFontsUrl("bebas", "noto");
    expect(url).toContain("Bebas+Neue");
    expect(url).toContain("Noto+Sans+JP");
    expect(url).toContain("fonts.googleapis.com");
  });
});
