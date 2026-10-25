import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const boundary = vi.hoisted(() => ({ getDb: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: boundary.getDb }));
vi.mock("@/lib/auth-server", () => ({ requireAdmin: boundary.requireAdmin }));
import { GET } from "./route";
let sqlite: DatabaseSync;
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  // Replace only SQLite's external clock; SQL grouping and DISTINCT are real.
  sqlite.function("date", { varargs: true }, (...args) => {
    if (args[0] !== "now") throw Error("unexpected clock input");
    if (args.length === 1) return "2026-10-25";
    if (args[1] === "-27 days") return "2026-09-28";
    throw Error("unexpected window");
  });
  sqlite.exec(`CREATE TABLE growth_events (id TEXT, day TEXT, session_hash TEXT, event TEXT, source TEXT, year INTEGER, league TEXT);`);
  const insert = sqlite.prepare("INSERT INTO growth_events VALUES (?,?,?,?,?,?,?)");
  const rows = [
    ["1","2026-10-25","a","result_view","x",2026,"central"],
    ["2","2026-10-25","a","result_view","x",2026,"pacific"],
    ["3","2026-10-25","a","result_view","other",2025,"all"],
    ["4","2026-10-25","b","result_view","other",2026,"central"],
    ["5","2026-10-24","yesterday","result_view","x",2026,"central"],
    ["6","2026-09-28","first","result_view","x",2026,"central"],
    ["7","2026-09-27","expired","result_view","x",2026,"central"],
    ["8","2026-10-26","future","result_view","x",2026,"central"],
    ["9","2026-10-25","a","x_share_start","x",2026,"central"],
    ["10","2026-10-25","a","x_share_start","x",2026,"central"],
    ["11","2026-10-25","a","card_download","x",2026,"all"],
  ];
  for (const row of rows) insert.run(...row);
  boundary.getDb.mockReset(); boundary.requireAdmin.mockResolvedValue({});
  boundary.getDb.mockReturnValue(drizzle(async (query, params, method) => {
    if (method !== "all") throw Error(`unexpected SQL operation ${method}`);
    return { rows: sqlite.prepare(query).all(...params) };
  }));
});
afterEach(() => sqlite.close());
it("aggregates daily tabs across scopes, preserves starts and bounds the 28 UTC days", async () => {
  const response = await GET(new Request("https://example.com/api/growth/events"));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
  const data = await response.json() as { dailyTotals: unknown[]; rows: Array<{ event: string }> };
  expect(data.dailyTotals).toEqual([
    { day: "2026-10-25", event: "card_download", events: 1, tabs: 1, xTabs: 1 },
    { day: "2026-10-25", event: "result_view", events: 4, tabs: 2, xTabs: 1 },
    { day: "2026-10-25", event: "x_share_start", events: 2, tabs: 1, xTabs: 1 },
    { day: "2026-10-24", event: "result_view", events: 1, tabs: 1, xTabs: 1 },
    { day: "2026-09-28", event: "result_view", events: 1, tabs: 1, xTabs: 1 },
  ]);
  expect(data.rows.filter((r: { event: string }) => r.event === "result_view")).toHaveLength(6);
  expect(JSON.stringify(data)).not.toContain('session_hash');
});
it("denies non-admin reads before querying any events", async () => {
  boundary.requireAdmin.mockResolvedValue(new Response(null, { status: 401 }));
  expect((await GET(new Request("https://example.com"))).status).toBe(401);
  expect(boundary.getDb).not.toHaveBeenCalled();
});
