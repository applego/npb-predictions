import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NPB_TEAMS } from "@/lib/teams";

const boundary = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/db", () => ({ getDb: boundary.getDb }));
import { GET } from "./route";
import type { exportPublicResults } from "@/lib/public-results-export";
type Export = NonNullable<Awaited<ReturnType<typeof exportPublicResults>>>;
async function readExport(response: Response): Promise<Export> { return await response.json() as Export; }

let sqlite: DatabaseSync;
const url = "https://example.com/api/rankings/commentators?year=2026&league=all&format=archive";
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE seasons (id INTEGER, year INTEGER, lock_date INTEGER);
    CREATE TABLE users (id INTEGER, name TEXT, slug TEXT, role TEXT, source TEXT, source_url TEXT, variant TEXT, email TEXT, firebase_uid TEXT);
    CREATE TABLE predictions (id INTEGER, user_id INTEGER, season_id INTEGER, variant TEXT, is_locked INTEGER, locked_at INTEGER, created_at INTEGER);
    CREATE TABLE ranking_picks (prediction_id INTEGER, league TEXT, rank INTEGER, team_name TEXT);
    CREATE TABLE actual_team_standings (season_id INTEGER, league TEXT, rank INTEGER, team_name TEXT, snapshot_date INTEGER, is_final INTEGER);
    INSERT INTO seasons VALUES (1,2026,1774000000),(2,2025,NULL);
    INSERT INTO users VALUES (1,'両リーグ','both','commentator','人物共通','https://example.com/person','人物側の別variant','private@example.com','private-uid'),
      (2,'パのみ','pacific-only','commentator',NULL,NULL,NULL,NULL,NULL),
      (3,'未ロック','draft','commentator',NULL,NULL,NULL,NULL,NULL),
      (4,'一般参加者','friend','friend',NULL,NULL,NULL,'friend@example.com',NULL),
      (5,'順位なし','empty','commentator',NULL,NULL,NULL,NULL,NULL);
    INSERT INTO predictions VALUES
      (11,1,1,'①',1,1773900000,1773000000),
      (12,1,1,NULL,1,NULL,1773100000),
      (21,2,1,'②',1,NULL,1772000000),
      (22,2,1,'①',1,1773000000,1773000000),
      (31,3,1,NULL,0,NULL,1772000000),
      (41,4,1,NULL,1,1773000000,1772000000),
      (51,5,1,NULL,1,NULL,1772000000),
      (61,2,2,NULL,1,NULL,1771000000);
  `);
  const insert = sqlite.prepare("INSERT INTO ranking_picks VALUES (?,?,?,?)");
  for (const id of [11,12,21,22,31,41,61]) for (const [i, team] of NPB_TEAMS.entries()) {
    if ([21,22].includes(id) && team.league !== "pacific") continue;
    insert.run(id, team.league, i % 6 + 1, team.name);
  }
  const standing = sqlite.prepare("INSERT INTO actual_team_standings VALUES (?,?,?,?,?,?)");
  for (const [i, team] of NPB_TEAMS.entries()) standing.run(1, team.league, i % 6 + 1, team.name, 1774000000, 1);
  // Real generated SQL executes against SQLite; only the D1 transport is replaced.
  boundary.getDb.mockReset().mockReturnValue(drizzle(async (sql, params, method) => {
    if (method !== "all") throw new Error(`Unexpected DB operation: ${method}`);
    const statement = sqlite.prepare(sql);
    statement.setReturnArrays(true);
    return { rows: statement.all(...params) as unknown as unknown[][] };
  }));
});
afterEach(() => sqlite.close());

describe("public results archive export entrypoint", () => {
  it("includes Pacific-only and empty entries, exports all locked candidates, selects before comparing leagues", async () => {
    const response = await GET(new Request(url));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const data = await readExport(response);
    expect(data.population).toMatchObject({ commentators: 3, predictions: 5, selectedPredictions: 3,
      eligible: { central: 1, pacific: 2, all: 1 } });
    expect(data.predictions.map((p: { predictionId: number }) => p.predictionId)).toEqual([11,12,21,22,51]);
    expect(data.predictions.filter((p: { selected: boolean }) => p.selected).map((p: { predictionId: number }) => p.predictionId)).toEqual([12,21,51]);
    expect(data.predictions.find((p: { predictionId: number }) => p.predictionId === 21)!.rankings).toHaveLength(6);
    expect(data.predictions.find((p: { predictionId: number }) => p.predictionId === 51)!.rankings).toEqual([]);
    expect(data.predictions[1]).toMatchObject({ variant: null, isLocked: true, lockedAt: null,
      createdAt: new Date(1773100000 * 1000).toISOString() });
    const text = JSON.stringify(data);
    for (const privateValue of ["private@example.com", "private-uid", "friend@example.com", '"email"', '"firebaseUid"', '"draft"']) expect(text).not.toContain(privateValue);
  });
  it("binds the exact public payload to a reproducible SHA-256, excluding observation metadata", async () => {
    const data = await readExport(await GET(new Request(url)));
    const { provenance, ...payload } = data;
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const hash = Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");
    expect(provenance.payloadHash).toBe(`sha256:${hash}`);
    expect(provenance.sourceUrl).toBe(url);
    expect((await readExport(await GET(new Request(url)))).provenance.payloadHash).toBe(provenance.payloadHash);
    sqlite.exec("UPDATE predictions SET created_at=1770000000 WHERE id=22");
    const changed = await readExport(await GET(new Request(url)));
    expect(changed.provenance.payloadHash).not.toBe(provenance.payloadHash);
    expect(changed.predictions.find((p: { predictionId: number }) => p.predictionId === 22)!.selected).toBe(true);
  });
  it("fails explicitly on quota errors and never substitutes the partial archive", async () => {
    boundary.getDb.mockImplementation(() => { throw new Error("D1 daily row read limit"); });
    const response = await GET(new Request(url));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Public results export unavailable; retry after source recovery" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("rejects ambiguous years and partial-population export requests before querying", async () => {
    for (const query of ["year=2026oops&format=archive", "year=2026&format=archive&league=pacific", "year=2026&format=csv", "year=2026&league=unknown"]) {
      expect((await GET(new Request(`https://example.com/api/rankings/commentators?${query}`))).status).toBe(400);
    }
    expect(boundary.getDb).not.toHaveBeenCalled();
    expect((await GET(new Request(url.replace("2026", "2024")))).status).toBe(404);
  });
  it("does not use a complete later variant when the canonical original has no picks", async () => {
    sqlite.exec("DELETE FROM ranking_picks WHERE prediction_id=12");
    const data = await readExport(await GET(new Request(url)));
    expect(data.population.eligible).toEqual({ central: 0, pacific: 1, all: 0 });
    expect(data.predictions.find((p: { predictionId: number }) => p.predictionId === 12)!.selected).toBe(true);
  });
});
