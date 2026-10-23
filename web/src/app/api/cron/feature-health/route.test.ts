import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NPB_TEAMS } from "@/lib/teams";

const boundary = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/db", () => ({ getDb: boundary.getDb }));
vi.mock("@/lib/news-feed", () => ({ generateNewsFeed: async () => [{ title: "公開結果" }] }));
import { GET } from "./route";

let sqlite: DatabaseSync;
const now = new Date("2026-10-23T00:45:00Z");
const old = Math.floor(now.getTime() / 1000) - 40 * 3600;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE seasons (id INTEGER, year INTEGER, label TEXT, is_active INTEGER, lock_date INTEGER, created_at INTEGER);
    CREATE TABLE users (id INTEGER, name TEXT, slug TEXT, avatar_url TEXT, role TEXT, source TEXT, source_url TEXT, variant TEXT, firebase_uid TEXT, email TEXT, created_at INTEGER);
    CREATE TABLE predictions (id INTEGER, user_id INTEGER, season_id INTEGER);
    CREATE TABLE ranking_picks (prediction_id INTEGER);
    CREATE TABLE actual_team_standings (season_id INTEGER, league TEXT, rank INTEGER, team_name TEXT, snapshot_date INTEGER, is_final INTEGER);
    INSERT INTO seasons VALUES (1,2026,'2026',1,NULL,1770000000),(2,2025,'2025',0,NULL,1740000000);
    INSERT INTO users (id,name,slug,role,created_at) VALUES (1,'解説者','test','commentator',1770000000);
    INSERT INTO predictions VALUES (1,1,1);
    INSERT INTO ranking_picks VALUES (1);
  `);
  const insert = sqlite.prepare("INSERT INTO actual_team_standings VALUES (?,?,?,?,?,?)");
  for (const league of ["central", "pacific"]) {
    NPB_TEAMS.filter((team) => team.league === league).forEach((team, i) => insert.run(1, league, i + 1, team.name, old, 1));
  }
  boundary.getDb.mockReset().mockReturnValue(drizzle(async (sql, params, method) => {
    if (method !== "all") throw new Error(`Unexpected DB operation: ${method}`);
    const statement = sqlite.prepare(sql);
    statement.setReturnArrays(true);
    return { rows: statement.all(...params) as unknown as unknown[][] };
  }));
});
afterEach(() => { sqlite.close(); vi.useRealTimers(); });

async function freshness() {
  const data = await (await GET()).json() as { allSources: { source: string; healthy: boolean; latestError: string | null; detail?: Record<string, unknown> }[] };
  return data.allSources.find((row) => row.source === "standings-freshness")!;
}

it("keeps complete explicitly final league snapshots healthy after automatic updates stop", async () => {
  expect(await freshness()).toMatchObject({ healthy: true, latestError: null, detail: { status: "final", ageHours: 40 } });
});
it("still rejects stale provisional standings even when the other league is final", async () => {
  sqlite.exec("UPDATE actual_team_standings SET is_final=0 WHERE league='pacific'");
  expect(await freshness()).toMatchObject({ healthy: false });
});
it("accepts complete recent provisional standings without calling them final", async () => {
  sqlite.prepare("UPDATE actual_team_standings SET is_final=0,snapshot_date=?").run(old + 39 * 3600);
  expect(await freshness()).toMatchObject({ healthy: true, detail: { status: "provisional" } });
});
it.each([
  "DELETE FROM actual_team_standings WHERE league='pacific' AND rank=6",
  "UPDATE actual_team_standings SET team_name='不明' WHERE league='pacific' AND rank=6",
  "UPDATE actual_team_standings SET snapshot_date=snapshot_date+60 WHERE league='pacific' AND rank=6",
  "UPDATE actual_team_standings SET rank=1 WHERE league='pacific' AND rank=6",
  "UPDATE actual_team_standings SET season_id=2 WHERE league='pacific'",
  "UPDATE actual_team_standings SET snapshot_date=2000000000 WHERE league='pacific'",
  "UPDATE actual_team_standings SET snapshot_date=snapshot_date+144060 WHERE league='pacific'",
  "INSERT INTO actual_team_standings SELECT season_id,league,7,team_name,snapshot_date,is_final FROM actual_team_standings WHERE league='pacific' AND rank=6",
])("does not exempt incomplete, invalid, future or wrong-season final data: %s", async (change) => {
  sqlite.exec(change);
  expect(await freshness()).toMatchObject({ healthy: false });
});
it("does not fall back to an older final snapshot when a newer provisional snapshot is stale", async () => {
  sqlite.exec("INSERT INTO actual_team_standings SELECT season_id,league,rank,team_name,snapshot_date+60,0 FROM actual_team_standings WHERE league='pacific'");
  expect(await freshness()).toMatchObject({ healthy: false });
});
it("does not let a fresh league hide the other league's stale provisional data", async () => {
  sqlite.exec("UPDATE actual_team_standings SET is_final=0");
  sqlite.prepare("UPDATE actual_team_standings SET snapshot_date=? WHERE league='central'").run(old + 39 * 3600);
  expect(await freshness()).toMatchObject({ healthy: false });
});
it("reports unavailable source evidence instead of treating D1 failure as final", async () => {
  boundary.getDb.mockImplementation(() => { throw new Error("D1 daily row read limit"); });
  expect(await freshness()).toMatchObject({ healthy: false, latestError: "D1 daily row read limit" });
});

it.each([0, 1].flatMap((final) => [0, 1, 300].map((offset) => ({ final, offset }))))(
  "requires observed timestamps at or before now (final=$final offset=$offset seconds)", async ({ final, offset }) => {
    sqlite.prepare("UPDATE actual_team_standings SET snapshot_date=?,is_final=? WHERE league='pacific'")
      .run(Math.floor(now.getTime() / 1000) + offset, final);
    expect((await freshness()).healthy).toBe(offset === 0);
  },
);
