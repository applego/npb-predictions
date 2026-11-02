// The sheet shows a participant as "registered and fixed" only with proof: locked, the lock
// time on record, and no change after it. Real migrations, real queries.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { NPB_TEAMS } from "@/lib/teams";

const boundary = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/db", () => ({ getDb: boundary.getDb }));
import { loadRegisteredPrediction } from "./registered-prediction";

const MIGRATIONS = resolve(__dirname, "../../drizzle");
const SAVED = Date.UTC(2026, 2, 20, 3) / 1000;
const LOCK = Date.UTC(2026, 2, 27, 9) / 1000;
let sqlite: DatabaseSync;

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(resolve(MIGRATIONS, file), "utf8"));
  boundary.getDb.mockReturnValue(drizzle(async (sql, params, method) => {
    const statement = sqlite.prepare(sql);
    if (method === "run") { statement.run(...(params as never[])); return { rows: [] }; }
    statement.setReturnArrays(true);
    const rows = statement.all(...(params as never[])) as unknown as unknown[][];
    return { rows: method === "get" ? (rows[0] ?? undefined) as never : rows };
  }, { schema }));
  sqlite.exec("INSERT INTO seasons (id, year, label, is_active) VALUES (1, 2026, '2026', 1)");
  sqlite.exec(`INSERT INTO users (id, name, slug, role) VALUES
    (1, '登録した人', 'saved', 'friend'), (2, '手で固定', 'hand', 'friend'), (3, '後から変更', 'late', 'friend'),
    (4, '下書き', 'draft', 'friend'), (5, '解説者', 'pro', 'commentator')`);
  sqlite.exec(`INSERT INTO predictions (id, user_id, season_id, is_locked, locked_at, created_at, updated_at, variant) VALUES
    (1, 1, 1, 1, ${LOCK}, ${SAVED}, ${SAVED}, 'default'),
    (2, 2, 1, 1, NULL, ${SAVED}, ${SAVED}, 'default'),
    (3, 3, 1, 1, ${LOCK}, ${SAVED}, ${LOCK + 60}, 'default'),
    (4, 4, 1, 0, NULL, ${SAVED}, ${SAVED}, 'default'),
    (5, 5, 1, 1, ${LOCK}, ${SAVED}, ${SAVED}, NULL)`);
  const pick = sqlite.prepare("INSERT INTO ranking_picks (prediction_id, league, rank, team_name) VALUES (?, ?, ?, ?)");
  for (let id = 1; id <= 5; id++) {
    for (const league of ["central", "pacific"] as const) NPB_TEAMS.filter((t) => t.league === league).forEach((t, i) => pick.run(id, league, i + 1, t.name));
  }
});

describe("loadRegisteredPrediction", () => {
  it("returns the participant's picks with the time they were last saved", async () => {
    const row = await loadRegisteredPrediction(2026, 1, "central");
    expect(row).toEqual({ userId: 1, name: "登録した人", registeredAt: new Date(SAVED * 1000).toISOString(),
      order: NPB_TEAMS.filter((t) => t.league === "central").map((t) => t.name) });
  });

  it("refuses rows without proof: no lock time, changed after the lock, not locked, or not a participant", async () => {
    for (const userId of [2, 3, 4, 5]) expect(await loadRegisteredPrediction(2026, userId, "central")).toBeNull();
    expect(await loadRegisteredPrediction(2027, 1, "central")).toBeNull();
  });

  it("returns null instead of failing the sheet when the database is unavailable", async () => {
    boundary.getDb.mockImplementation(() => { throw new Error("D1 limit"); });
    expect(await loadRegisteredPrediction(2026, 1, "central")).toBeNull();
  });
});
