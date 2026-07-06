import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTeamArticleFromRows } from "@/lib/public-image-data";
import { NPB_TEAMS } from "@/lib/teams";

vi.mock("@/db", () => ({
  getDb: () => {
    throw new Error("DB access is not used by these pure builder tests");
  },
}));

const root = process.cwd();

function readSource(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("public image routes", () => {
  it("do not ship sample generators or hard-coded sports article data", () => {
    const source = [
      "src/app/api/newspaper/[teamSlug]/route.tsx",
      "src/app/api/ranking-card/[type]/route.tsx",
      "src/app/newspaper/page.tsx",
      "src/lib/public-image-data.ts",
    ]
      .map(readSource)
      .join("\n");

    expect(source).not.toMatch(/buildMock|Mock data|SAMPLE/);
    expect(source).not.toContain("木浪");
    expect(source).not.toContain("福本 豊");
    expect(source).not.toContain("清原 和博");
    expect(source).not.toContain("Ａ氏");
  });

  it("renders tied finals as draws rather than defeats", () => {
    const team = NPB_TEAMS.find((t) => t.slug === "hanshin-tigers")!;
    const article = buildTeamArticleFromRows(
      team,
      {
        id: 1,
        seasonId: 2,
        gameDate: "2026-07-06",
        league: "central",
        homeTeam: "阪神タイガース",
        awayTeam: "広島東洋カープ",
        homeScore: 2,
        awayScore: 2,
        status: "final",
        winner: "tie",
        stadium: "甲子園",
        snapshotDate: new Date("2026-07-06T12:00:00Z"),
      },
      null,
      null,
    );

    const headline = [...article.headlineLine1, ...article.headlineLine2]
      .map((part) => part.char)
      .join("");
    expect(headline).toContain("分け");
    expect(headline).not.toContain("惜敗");
  });

  it("does not describe cancelled games as upcoming previews", () => {
    const team = NPB_TEAMS.find((t) => t.slug === "hanshin-tigers")!;
    const article = buildTeamArticleFromRows(
      team,
      {
        id: 1,
        seasonId: 2,
        gameDate: "2026-07-06",
        league: "central",
        homeTeam: "阪神タイガース",
        awayTeam: "広島東洋カープ",
        homeScore: null,
        awayScore: null,
        status: "cancelled",
        winner: null,
        stadium: "甲子園",
        snapshotDate: new Date("2026-07-06T12:00:00Z"),
      },
      null,
      null,
    );

    expect(article.scoreLine).toBe("中止");
    expect(article.body[0]).toContain("中止となった");
    expect(article.body[0]).not.toContain("臨む");
  });

  it("renders in-progress games as live instead of pregame or final", () => {
    const team = NPB_TEAMS.find((t) => t.slug === "hanshin-tigers")!;
    const article = buildTeamArticleFromRows(
      team,
      {
        id: 1,
        seasonId: 2,
        gameDate: "2026-07-06",
        league: "central",
        homeTeam: "阪神タイガース",
        awayTeam: "広島東洋カープ",
        homeScore: 3,
        awayScore: 1,
        status: "in_progress",
        winner: null,
        stadium: "甲子園",
        snapshotDate: new Date("2026-07-06T12:00:00Z"),
      },
      null,
      null,
    );

    const headline = [...article.headlineLine1, ...article.headlineLine2]
      .map((part) => part.char)
      .join("");
    expect(headline).toContain("試合中");
    expect(article.body[0]).toContain("戦っている");
    expect(article.body[0]).not.toContain("終えた");
    expect(article.body[0]).not.toContain("臨む");
  });
});
