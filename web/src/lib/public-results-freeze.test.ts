import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { NPB_TEAMS } from "./teams";
import { PUBLIC_RESULTS_SELECTION } from "./canonical-prediction";
import { freezePublicResults, verifyPublicResultsExport, type PublicResultsExport } from "./public-results-freeze";
const observedAt = "2026-10-21T09:00:00.000Z";
const rankings = NPB_TEAMS.map((team, i) => ({ league: team.league, rank: i % 6 + 1, teamName: team.name }));
const official = rankings.map((row) => ({ ...row, isFinal: true, snapshotDate: observedAt }));
function signed(data: PublicResultsExport): string {
  const { provenance, ...payload } = data;
  provenance.payloadHash = `sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
  return JSON.stringify({ ...payload, provenance });
}
function fixture(): PublicResultsExport {
  const person = { userId: 1, name: "両リーグ", slug: "both", personSource: null, personSourceUrl: null,
    isLocked: true as const, lockedAt: null, createdAt: "2026-03-01T00:00:00.000Z", variant: null, selected: true };
  const data: PublicResultsExport = {
    schema: "npb-public-results-export.v1", year: 2026, seasonId: 1, seasonLockDate: null,
    selectionRule: PUBLIC_RESULTS_SELECTION,
    population: { kind: "season-locked-commentators", league: "all", commentators: 4,
      predictions: 5, selectedPredictions: 4, eligible: { central: 1, pacific: 2, all: 1 },
      includes: "all locked candidates", excludes: "unlocked and noncommentators" },
    limitations: ["Current lock flag is not a historical attestation"],
    predictions: [
      { ...person, predictionId: 11, rankings },
      { ...person, predictionId: 12, variant: "①", selected: false, rankings: [...rankings].reverse() },
      { ...person, userId: 2, name: "パのみ", slug: "pacific", predictionId: 21, rankings: rankings.filter((row) => row.league === "pacific") },
      { ...person, userId: 3, name: "空", slug: "empty", predictionId: 31, rankings: [] },
      { ...person, userId: 4, name: "不完全", slug: "incomplete", predictionId: 41, rankings: rankings.slice(0, 1) },
    ],
    snapshots: (["central", "pacific"] as const).map((league) => ({ league, status: "final", updatedAt: observedAt, stale: false, rows: official.filter((row) => row.league === league) })),
    provenance: { sourceUrl: "https://npb-predictions.pages.dev/api/rankings/commentators?year=2026&league=all&format=archive",
      observedAt, payloadHash: "", hashScope: "JSON.stringify(response without provenance), UTF-8" },
  };
  return JSON.parse(signed(data)) as PublicResultsExport;
}
function cli(raw: string, outputContents?: string) {
  const dir = mkdtempSync(join(tmpdir(), "npb-public-freeze-"));
  const input = join(dir, "export.json"); const seasons = join(dir, "seasons.json"); const output = join(dir, "archive.json");
  writeFileSync(input, raw); writeFileSync(seasons, JSON.stringify([{ year: 2026 }]));
  if (outputContents !== undefined) writeFileSync(output, outputContents);
  // Only the external network boundary is replaced; unexpected requests fail closed.
  const html = (league: "central" | "pacific") => `<title>2026年度 ${league === "central" ? "セントラル" : "パシフィック"}・リーグ</title><p>全日程終了</p><h4>チーム勝敗表</h4><table>${NPB_TEAMS.filter((team) => team.league === league).map((team) => `<tr><td>${team.name}</td><td>143</td><td>70</td><td>70</td><td>3</td></tr>`).join("")}</table>`;
  const preload = join(dir, "network.mjs");
  writeFileSync(preload, `const fixtures = ${JSON.stringify({ "https://npb.jp/bis/2026/stats/std_c.html": html("central"), "https://npb.jp/bis/2026/stats/std_p.html": html("pacific") })}; globalThis.fetch = async (url) => { if (!Object.hasOwn(fixtures, String(url))) throw new Error("Unexpected request"); return new Response(fixtures[String(url)]); };`);
  const result = spawnSync(process.execPath, ["--import", "tsx", "--import", preload, resolve("scripts/build-public-results-archive.ts"), "2026", input, seasons, output], { encoding: "utf8", timeout: 20000 });
  return { result, output };
}
describe("complete public export freeze", () => {
  it("retains Pacific-only, empty/incomplete entries, candidates and null lock evidence through the actual CLI", () => {
    const data = fixture(); const raw = JSON.stringify(data);
    const { result, output } = cli(raw);
    expect(result.stderr).toBe(""); expect(result.status).toBe(0);
    const archive = JSON.parse(readFileSync(output, "utf8"));
    expect(archive.publicExport).toEqual(data); expect(archive.population).toEqual(data.population);
    expect(archive.commentators.map((row: { predictionId: number }) => row.predictionId)).toEqual([11, 21, 31, 41]);
    expect(archive.commentators[1].rankings).toHaveLength(6); expect(archive.commentators[2].rankings).toEqual([]);
    expect(archive.commentators[3].rankings).toHaveLength(1);
    expect(archive.commentators[0]).toMatchObject({ createdAt: data.predictions[0].createdAt, lockedAt: null });
    expect(archive.provenance).toMatchObject({ predictionsUrl: data.provenance.sourceUrl, predictionsObservedAt: observedAt,
      predictionsPayloadHash: data.provenance.payloadHash, predictionsSha256: createHash("sha256").update(raw).digest("hex") });
    expect(archive.standings).toHaveLength(12);
  });
  it("rejects a partial legacy export and never overwrites an existing artifact", () => {
    const old = JSON.stringify({ season: { year: 2026 }, totalCommentators: 1, commentators: [] });
    const rejected = cli(old, "existing archive");
    expect(rejected.result.status).toBe(1); expect(readFileSync(rejected.output, "utf8")).toBe("existing archive");
    const valid = cli(JSON.stringify(fixture()), "existing archive");
    expect(valid.result.status).toBe(1); expect(valid.result.stderr).toContain("EEXIST");
    expect(readFileSync(valid.output, "utf8")).toBe("existing archive");
  });
  it("rejects tampering and unknown private fields even with a recomputed hash", () => {
    const data = fixture(); data.predictions[0].name = "tampered";
    expect(() => verifyPublicResultsExport(JSON.stringify(data), 2026)).toThrow("hash mismatch");
    Object.assign(data.predictions[0], { email: "private@example.invalid" });
    expect(() => verifyPublicResultsExport(signed(data), 2026)).toThrow();
  });
  it("checks the population and canonical selection independently of the hash", () => {
    const data = fixture(); data.population.predictions++;
    expect(() => verifyPublicResultsExport(signed(data), 2026)).toThrow("population mismatch");
    const wrong = fixture(); wrong.predictions[0].selected = false; wrong.predictions[1].selected = true;
    expect(() => verifyPublicResultsExport(signed(wrong), 2026)).toThrow("Noncanonical");
    const eligible = fixture(); eligible.population.eligible.pacific++;
    expect(() => verifyPublicResultsExport(signed(eligible), 2026)).toThrow("eligibility mismatch");
  });
  it("rejects wrong year/source, duplicates and unfinished official standings", () => {
    const data = fixture(); data.provenance.sourceUrl = data.provenance.sourceUrl.replace("league=all", "league=central");
    expect(() => verifyPublicResultsExport(signed(data), 2026)).toThrow("year/source mismatch");
    expect(() => verifyPublicResultsExport(JSON.stringify(fixture()), 2025)).toThrow("year/source mismatch");
    const duplicate = fixture(); duplicate.predictions.push(duplicate.predictions[0]);
    expect(() => verifyPublicResultsExport(signed(duplicate), 2026)).toThrow("Duplicate");
    expect(() => freezePublicResults(JSON.stringify(fixture()), 2026, [2026], official.map((row) => ({ ...row, isFinal: false })), observedAt)).toThrow("completed seasons");
  });
});
