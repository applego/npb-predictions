import { test, expect } from "@playwright/test";

// Regression guard against the "all scores 0" incident:
// - actual_team_standings stores fullName; ranking_picks used to store shortName
//   so scoring.calcRankingScore() silently produced 0 for every user.
// - These tests fail if the LIVE SCOREBOARD API ever returns an all-zero
//   scoreboard while actual standings exist, or if the page renders empty.

test.describe("LIVE SCOREBOARD", () => {
  test("API returns scores that include at least one non-zero entry", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/seasons/2026/current-scoreboard"
    );
    expect(res.status(), "scoreboard API must respond 200").toBe(200);
    const data = (await res.json()) as {
      scores: { userId: number; userName: string; totalScore: number }[];
      standings: { league: string; rank: number; teamName: string }[];
    };

    // Scoreboard must be populated.
    expect(data.scores.length, "scoreboard should list users").toBeGreaterThan(
      0
    );

    // If actual standings exist (= season has started), at least one user
    // MUST have a non-zero score. All-zero means name normalization broke
    // again or daily-scores has not run.
    if (data.standings.length >= 12) {
      const nonzero = data.scores.filter((s) => s.totalScore !== 0).length;
      const ratio = nonzero / data.scores.length;
      expect(
        ratio,
        `scoreboard all-zero detected — ${data.scores.length} users, 0 with score (actuals present: ${data.standings.length} standings). Likely team_name shortName/fullName mismatch.`
      ).toBeGreaterThan(0.5);
    }
  });

  test("/rankings/live page renders without 5xx and shows score table", async ({
    page,
  }) => {
    const res = await page.goto("/rankings/live");
    expect(res?.status(), "/rankings/live must not 5xx").toBeLessThan(500);
    await page.waitForLoadState("networkidle");

    const body = (await page.textContent("body")) ?? "";
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Internal Server Error");
    expect(body).toMatch(/LIVE SCOREBOARD|スコア|順位/i);
  });
});
