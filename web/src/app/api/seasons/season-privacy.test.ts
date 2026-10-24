import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
const boundary = vi.hoisted(() => ({ getDb: vi.fn(), requireAuth: vi.fn() }));
vi.mock("@/db", () => ({ getDb: boundary.getDb }));
vi.mock("@/lib/auth-server", () => ({ requireAuth: boundary.requireAuth }));
import { GET as list } from "./[year]/predictions/route";
import { GET as detail } from "./[year]/users/[userId]/route";
import { GET as own } from "./[year]/me/route";
let sqlite: DatabaseSync;
const req = () => new Request("https://example.com/api/seasons/2026/me?userId=2&uid=other");
const params = (year = "2026", userId = "1") => ({ params: Promise.resolve({ year, userId }) });
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE seasons (id INTEGER, year INTEGER, label TEXT, is_active INTEGER, lock_date INTEGER, created_at INTEGER);
    CREATE TABLE users (id INTEGER, name TEXT, slug TEXT, avatar_url TEXT, role TEXT, source TEXT, source_url TEXT, variant TEXT, email TEXT, firebase_uid TEXT, created_at INTEGER);
    CREATE TABLE predictions (id INTEGER, user_id INTEGER, season_id INTEGER, variant TEXT, is_locked INTEGER, locked_at INTEGER, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE ranking_picks (id INTEGER, prediction_id INTEGER, league TEXT, rank INTEGER, team_name TEXT);
    CREATE TABLE title_picks (id INTEGER, prediction_id INTEGER, league TEXT, category TEXT, player_name TEXT, team_name TEXT);
    INSERT INTO seasons VALUES (1,2026,'2026',1,NULL,1),(2,2025,'2025',0,NULL,1);
    INSERT INTO users VALUES (1,'本人','owner',NULL,'friend',NULL,NULL,NULL,'owner@example.com','private-owner-uid',1),
      (2,'別人','other',NULL,'commentator','番組','https://example.com',NULL,'other@example.com','private-other-uid',1);
    INSERT INTO predictions VALUES (11,1,1,NULL,0,NULL,1,1),(12,2,1,NULL,1,NULL,1,1),(13,2,2,NULL,1,NULL,1,1);
    INSERT INTO ranking_picks VALUES (1,11,'central',1,'非公開球団'),(2,12,'pacific',1,'公開球団');
    INSERT INTO title_picks VALUES (1,11,'central','wins','非公開選手',NULL);
  `);
  const db = drizzle(async (sql, params, method) => {
    if (method !== "all" && method !== "get") throw new Error(`Unexpected operation ${method}`);
    const statement = sqlite.prepare(sql); statement.setReturnArrays(true);
    return { rows: method === "get" ? statement.get(...params) as unknown as unknown[] : statement.all(...params) as unknown as unknown[][] };
  }, { schema });
  boundary.getDb.mockReset().mockReturnValue(db);
  boundary.requireAuth.mockReset().mockResolvedValue({ user: { id: 1 } });
});
afterEach(() => sqlite.close());
function safe(data: unknown) {
  const text = JSON.stringify(data);
  for (const value of ['"email"','"firebaseUid"','@example.com','private-owner-uid','private-other-uid']) expect(text).not.toContain(value);
}
describe("season prediction privacy boundary", () => {
  it("lists only locked predictions with public user fields and real picks", async () => {
    const response = await list(req(), params()); expect(response.status).toBe(200);
    const data = await response.json() as Array<{ id: number; rankingPicks: Array<{ teamName: string }>; user: { name: string; source: string } }>; safe(data);
    expect(data.map((p: { id: number }) => p.id)).toEqual([12]);
    expect(data[0].rankingPicks[0].teamName).toBe("公開球団");
    expect(data[0].user).toMatchObject({ name: "別人", source: "番組" });
  });
  it("serves locked detail by id or exact slug and hides drafts", async () => {
    for (const id of ["2", "other"]) {
      const response = await detail(req(), params("2026", id));
      expect(response.status).toBe(200); const data = await response.json() as { id: number; isLocked: boolean; rankingPicks: Array<{ teamName: string }>; user: { name: string; source: string } }; safe(data); expect(data.id).toBe(12);
    }
    for (const id of ["1", "owner", "2garbage"]) expect((await detail(req(), params("2026", id))).status).toBe(404);
  });
  it("reads only the verified caller even with forged uid/userId query, including their draft", async () => {
    const response = await own(req(), params()); expect(response.status).toBe(200);
    const data = await response.json() as { id: number; isLocked: boolean; rankingPicks: Array<{ teamName: string }>; user: { name: string; source: string } }; safe(data);
    expect(data.id).toBe(11); expect(data.isLocked).toBe(false);
    expect(data.rankingPicks[0].teamName).toBe("非公開球団");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Authorization");
  });
  it("requires authentication before prediction DB lookup and prevents caching auth failures", async () => {
    boundary.requireAuth.mockResolvedValue(new Response('{"error":"Unauthorized"}', { status: 401 }));
    const response = await own(req(), params()); expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(boundary.getDb).not.toHaveBeenCalled();
  });
  it("rejects ambiguous years on every entry before querying", async () => {
    for (const year of ["2026oops","2026.0","-2026", "20260"]) {
      for (const route of [list, detail, own]) expect((await route(req(), params(year))).status).toBe(400);
    }
    expect(boundary.getDb).not.toHaveBeenCalled(); expect(boundary.requireAuth).not.toHaveBeenCalled();
  });
  it("separates no prediction, absent season and database failure", async () => {
    expect((await own(req(), params("2025"))).status).toBe(404);
    expect((await own(req(), params("2024"))).status).toBe(404);
    boundary.getDb.mockImplementation(() => { throw Error("quota"); });
    const response = await own(req(), params()); expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
