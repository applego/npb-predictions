// Runs the real UPDATE against the real migrations: a prediction registered before the lock
// time becomes locked with the season's lock time; anything else is left alone.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import type { DbClient } from "@/db";
import { lockDuePredictions } from "./prediction-lock";

const MIGRATIONS = resolve(__dirname, "../../drizzle");
const LOCK = Date.UTC(2027, 2, 26, 9, 0) / 1000; // opening day 18:00 JST
const OLD_LOCK = LOCK - 2 * 365 * 86400;
let sqlite: DatabaseSync;
let db: DbClient;

function locked(id: number) {
  return sqlite.prepare("SELECT is_locked, locked_at FROM predictions WHERE id = ?").get(id) as { is_locked: number; locked_at: number | null };
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(resolve(MIGRATIONS, file), "utf8"));
  db = drizzle(async (sql, params, method) => {
    const statement = sqlite.prepare(sql);
    if (method === "run") { statement.run(...(params as never[])); return { rows: [] }; }
    statement.setReturnArrays(true);
    const rows = statement.all(...(params as never[])) as unknown as unknown[][];
    return { rows: method === "get" ? (rows[0] ?? undefined) as never : rows };
  }, { schema }) as unknown as DbClient;
  sqlite.exec(`INSERT INTO seasons (id, year, label, is_active, lock_date) VALUES (1, 2027, '2027', 1, ${LOCK}), (2, 2028, '2028', 0, NULL), (3, 2025, '2025', 0, ${OLD_LOCK})`);
  sqlite.exec("INSERT INTO users (id, name, slug, role) VALUES (1, 'a', 'a', 'friend'), (2, 'b', 'b', 'friend'), (3, 'c', 'c', 'friend')");
  sqlite.exec(`INSERT INTO predictions (id, user_id, season_id, is_locked, created_at, updated_at) VALUES
    (1, 1, 1, 0, ${LOCK - 86400}, ${LOCK - 3600}),
    (2, 2, 1, 0, ${LOCK - 86400}, ${LOCK + 60}),
    (3, 3, 2, 0, ${LOCK - 86400}, ${LOCK - 3600}),
    (4, 1, 3, 0, ${OLD_LOCK - 100}, ${OLD_LOCK - 100})`);
});

describe("lockDuePredictions", () => {
  it("does nothing before the lock time", async () => {
    expect(await lockDuePredictions(db, new Date((LOCK - 1) * 1000))).toBe(0);
    expect(locked(1).is_locked).toBe(0);
  });

  it("locks rows registered before the lock time with the season's lock time", async () => {
    expect(await lockDuePredictions(db, new Date((LOCK + 3600) * 1000))).toBe(1);
    expect(locked(1)).toEqual({ is_locked: 1, locked_at: LOCK });
    // Changed after the lock time (not possible through the API) or in a season without a lock time.
    expect(locked(2).is_locked).toBe(0);
    expect(locked(3).is_locked).toBe(0);
    // Old seasons are outside the lookback and are not scanned.
    expect(locked(4).is_locked).toBe(0);
    expect(await lockDuePredictions(db, new Date((LOCK + 7200) * 1000))).toBe(0);
  });
});
