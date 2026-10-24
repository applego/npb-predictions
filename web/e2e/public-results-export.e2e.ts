import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";

test("public archive export includes Pacific-only commentators with canonical evidence and payload hash", async ({ request }) => {
  const response = await request.get("/api/rankings/commentators?year=2026&league=all&format=archive");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const data = await response.json();
  expect(data.schema).toBe("npb-public-results-export.v1");
  expect(data.population.kind).toBe("season-locked-commentators");
  expect(data.population.eligible.pacific).toBeGreaterThan(data.population.eligible.all);
  // The production seed has Pacific-only commentators; the synthetic journey
  // fixture supplies two both-league entries. Neither fills the other's gaps.
  const pacificOnly = data.predictions.find((p: { slug: string }) => p.slug === "kondo-hiroshi");
  expect(pacificOnly).toBeDefined();
  expect(pacificOnly.selected).toBe(true);
  expect(pacificOnly.isLocked).toBe(true);
  expect(pacificOnly.lockedAt).toBeNull();
  expect(Number.isFinite(Date.parse(pacificOnly.createdAt))).toBe(true);
  expect(pacificOnly.rankings).toHaveLength(6);
  expect(pacificOnly.rankings.every((p: { league: string }) => p.league === "pacific")).toBe(true);
  expect(data.predictions.some((p: { slug: string }) => p.slug === "tsuneshige")).toBe(false);
  expect(data.predictions.some((p: { slug: string }) => p.slug === "kumagae")).toBe(false);
  for (const prediction of data.predictions) {
    expect(prediction).not.toHaveProperty("email");
    expect(prediction).not.toHaveProperty("firebaseUid");
  }
  const { provenance, ...payload } = data;
  expect(provenance.payloadHash).toBe(`sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`);
  expect(data.snapshots.map((s: { rows: unknown[] }) => s.rows.length)).toEqual([6,6]);
});
