import { describe, it, expect } from "vitest";
import { NPB_TEAMS, getTeamByName, getTeamBySlug, getTeamsByLeague } from "../teams";

describe("NPB_TEAMS completeness", () => {
  it("has exactly 12 teams", () => {
    expect(NPB_TEAMS.length).toBe(12);
  });

  it("has 6 central teams", () => {
    expect(getTeamsByLeague("central").length).toBe(6);
  });

  it("has 6 pacific teams", () => {
    expect(getTeamsByLeague("pacific").length).toBe(6);
  });

  it("all teams have color and textColor", () => {
    for (const t of NPB_TEAMS) {
      expect(t.color, `${t.shortName} missing color`).toBeTruthy();
      expect(t.textColor, `${t.shortName} missing textColor`).toBeTruthy();
      expect(t.abbr, `${t.shortName} missing abbr`).toBeTruthy();
    }
  });

  it("all teams have unique slugs", () => {
    const slugs = NPB_TEAMS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all teams have unique abbr", () => {
    const abbrs = NPB_TEAMS.map((t) => t.abbr);
    expect(new Set(abbrs).size).toBe(abbrs.length);
  });
});

describe("getTeamByName", () => {
  const EXPECTED_TEAMS = [
    "巨人", "阪神", "DeNA", "広島", "中日", "ヤクルト",
    "ソフトバンク", "日本ハム", "ロッテ", "楽天", "西武", "オリックス",
  ];

  for (const name of EXPECTED_TEAMS) {
    it(`finds ${name} by shortName`, () => {
      const team = getTeamByName(name);
      expect(team, `${name} not found`).toBeTruthy();
      expect(team!.shortName).toBe(name);
    });
  }

  it("returns undefined for unknown team", () => {
    expect(getTeamByName("横浜ベイスターズ")).toBeUndefined();
  });
});

describe("team colors are valid CSS", () => {
  it("all colors start with #", () => {
    for (const t of NPB_TEAMS) {
      expect(t.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("all textColors are valid", () => {
    for (const t of NPB_TEAMS) {
      expect(t.textColor).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
    }
  });
});
