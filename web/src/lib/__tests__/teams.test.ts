import { describe, it, expect } from "vitest";
import {
  NPB_TEAMS,
  getTeamBySlug,
  getTeamsByLeague,
  type NpbTeam,
} from "../teams";

describe("NPB_TEAMS", () => {
  it("has exactly 12 teams", () => {
    expect(NPB_TEAMS).toHaveLength(12);
  });

  it("has 6 central league teams", () => {
    expect(NPB_TEAMS.filter((t) => t.league === "central")).toHaveLength(6);
  });

  it("has 6 pacific league teams", () => {
    expect(NPB_TEAMS.filter((t) => t.league === "pacific")).toHaveLength(6);
  });

  it("all teams have non-empty slug, name, shortName, and league", () => {
    for (const team of NPB_TEAMS) {
      expect(team.slug).toBeTruthy();
      expect(team.name).toBeTruthy();
      expect(team.shortName).toBeTruthy();
      expect(["central", "pacific"]).toContain(team.league);
    }
  });

  it("all slugs are unique", () => {
    const slugs = NPB_TEAMS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all slugs use kebab-case (lowercase, hyphens only)", () => {
    for (const team of NPB_TEAMS) {
      expect(team.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("getTeamBySlug", () => {
  it("returns the team for a known slug", () => {
    const team = getTeamBySlug("yomiuri-giants");
    expect(team).toBeDefined();
    expect(team?.name).toBe("読売ジャイアンツ");
    expect(team?.league).toBe("central");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getTeamBySlug("unknown-team")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getTeamBySlug("")).toBeUndefined();
  });

  it("is case-sensitive (uppercase does not match)", () => {
    expect(getTeamBySlug("Yomiuri-Giants")).toBeUndefined();
  });

  it("returns a pacific league team by slug", () => {
    const team = getTeamBySlug("softbank-hawks");
    expect(team?.league).toBe("pacific");
    expect(team?.shortName).toBe("ソフトバンク");
  });
});

describe("getTeamsByLeague", () => {
  it("returns 6 central league teams", () => {
    const teams = getTeamsByLeague("central");
    expect(teams).toHaveLength(6);
    expect(teams.every((t) => t.league === "central")).toBe(true);
  });

  it("returns 6 pacific league teams", () => {
    const teams = getTeamsByLeague("pacific");
    expect(teams).toHaveLength(6);
    expect(teams.every((t) => t.league === "pacific")).toBe(true);
  });

  it("central + pacific covers all 12 teams", () => {
    const central = getTeamsByLeague("central");
    const pacific = getTeamsByLeague("pacific");
    expect(central.length + pacific.length).toBe(NPB_TEAMS.length);
  });

  it("does not mutate the original NPB_TEAMS array", () => {
    const before = NPB_TEAMS.length;
    getTeamsByLeague("central");
    expect(NPB_TEAMS.length).toBe(before);
  });
});
