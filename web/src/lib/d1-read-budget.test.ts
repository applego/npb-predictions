// Read budget: D1 bills rows scanned and the free quota is shared by every
// database on the account. Public endpoints must cost a bounded number of
// rows per request no matter how many users, predictions or visits exist, so
// this runs the real routes against real D1 (miniflare) with 10x data and
// checks meta.rows_read of every statement a warm request issues.
import { appendFileSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { NPB_TEAMS } from "@/lib/teams";

const boundary = vi.hoisted(() => ({ getDb: vi.fn(), requireAuth: vi.fn() }));
vi.mock("@/db", () => ({ getDb: boundary.getDb }));
vi.mock("@/lib/auth-server", () => ({ requireAuth: boundary.requireAuth }));
vi.mock("@cloudflare/next-on-pages", () => ({ getRequestContext: () => ({ env: { PUBLIC_RESULTS_ARCHIVE: "0" } }) }));

/** Rows one warm request may read, independent of data size and traffic. */
const BUDGET = 500;
/** 10x the production population of 2026-10 (≈130 locked predictions/season). */
const PREDICTIONS_PER_SEASON = 1300;
const SNAPSHOT_DAYS = 20;
const SEASONS = [2024, 2025, 2026];

type Stmt = { sql: string; params: unknown[] };
let dispose: () => Promise<void>;
let real: D1Database;
let log: Stmt[] = [];

function recording(sql: string, stmt: D1PreparedStatement, params: unknown[] = []): D1PreparedStatement {
  return new Proxy(stmt, {
    get(target, key) {
      if (key === "bind") return (...p: unknown[]) => recording(sql, target.bind(...p), p);
      if (key === "__rec") return { sql, params };
      if (key === "__inner") return target;
      if (["all", "raw", "run", "first"].includes(key as string)) {
        return (...args: unknown[]) => {
          log.push({ sql, params });
          return (target as never as Record<string, (...a: unknown[]) => unknown>)[key as string](...args);
        };
      }
      return Reflect.get(target, key);
    },
  });
}

/** Replays the logged reads (drizzle uses raw(), which carries no meta). */
async function rowsRead(): Promise<number> {
  let total = 0;
  for (const s of log.filter((x) => /^\s*select/i.test(x.sql))) {
    total += (await real.prepare(s.sql).bind(...s.params).all()).meta.rows_read ?? 0;
  }
  return total;
}

async function seed(db: D1Database) {
  const statements: D1PreparedStatement[] = [];
  const add = (sql: string, ...params: unknown[]) => statements.push(db.prepare(sql).bind(...params));
  const users = PREDICTIONS_PER_SEASON + 1;
  for (let u = 1; u <= users; u++) add("INSERT INTO users (id, name, slug, role, firebase_uid) VALUES (?, ?, ?, ?, ?)", u, `予想者${u}`, `u${u}`, u % 2 ? "commentator" : "friend", `uid-${u}`);
  let predId = 0;
  SEASONS.forEach((year, s) => {
    const seasonId = s + 1;
    add("INSERT INTO seasons (id, year, label, is_active) VALUES (?, ?, ?, ?)", seasonId, year, String(year), year === 2026 ? 1 : 0);
    for (const league of ["central", "pacific"] as const) {
      NPB_TEAMS.filter((t) => t.league === league).forEach((team, i) =>
        add("INSERT INTO actual_team_standings (season_id, league, rank, team_name, snapshot_date, is_final) VALUES (?, ?, ?, ?, ?, 1)", seasonId, league, i + 1, team.name, 1_700_000_000));
    }
    for (let u = 1; u <= PREDICTIONS_PER_SEASON; u++) {
      predId += 1;
      add("INSERT INTO predictions (id, user_id, season_id, is_locked, created_at) VALUES (?, ?, ?, 1, ?)", predId, u, seasonId, 1_700_000_000 + predId);
      const values: unknown[] = [];
      for (const league of ["central", "pacific"] as const) {
        const teams = NPB_TEAMS.filter((t) => t.league === league);
        teams.forEach((_, r) => values.push(predId, league, r + 1, teams[(r + u) % teams.length].name));
      }
      add(`INSERT INTO ranking_picks (prediction_id, league, rank, team_name) VALUES ${Array(12).fill("(?, ?, ?, ?)").join(", ")}`, ...values);
      for (let day = 0; day < SNAPSHOT_DAYS; day += 5) {
        add("INSERT INTO score_snapshots (user_id, season_id, total_score, snapshot_date) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)",
          ...[0, 1, 2, 3, 4].flatMap((d) => [u, seasonId, (u * 31 + day + d) % 997, 1_700_000_000 + (day + d) * 86_400]));
      }
    }
  });
  for (let i = 0; i < statements.length; i += 500) await db.batch(statements.slice(i, i + 500));
}

beforeAll(async () => {
  const proxy = await getPlatformProxy({ persist: { path: mkdtempSync(join(tmpdir(), "d1-budget-")) } });
  dispose = proxy.dispose;
  real = (proxy.env as { DB: D1Database }).DB;
  const dir = resolve(__dirname, "../../drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const statements = readFileSync(resolve(dir, file), "utf8")
      .split(/;\s*(?:--> statement-breakpoint)?\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.replace(/--[^\n]*/g, "").trim());
    for (const sql of statements) await real.prepare(sql).run();
  }
  await seed(real);
  const db = new Proxy(real, {
    get(target, key) {
      if (key === "prepare") return (sql: string) => recording(sql, target.prepare(sql));
      if (key === "batch") return (stmts: D1PreparedStatement[]) => {
        for (const s of stmts) log.push((s as never as { __rec: Stmt }).__rec);
        return target.batch(stmts.map((s) => (s as never as { __inner: D1PreparedStatement }).__inner));
      };
      return Reflect.get(target, key);
    },
  });
  boundary.getDb.mockReturnValue(drizzle(db, { schema }));
  boundary.requireAuth.mockResolvedValue({ user: { id: 7, name: "予想者7" }, token: { uid: "uid-7" } });
}, 180_000);
afterAll(async () => { await dispose?.(); });

const year = { params: Promise.resolve({ year: "2026" }) };
const endpoints: [string, () => Promise<unknown>][] = [
  ["GET /api/rankings/all-time", async () => (await import("@/app/api/rankings/all-time/route")).GET()],
  ["GET /api/news", async () => (await import("@/app/api/news/route")).GET(new Request("https://x/api/news?limit=30"))],
  ["GET /api/rankings/commentators", async () => (await import("@/app/api/rankings/commentators/route")).GET(new Request("https://x/api/rankings/commentators?year=2026"))],
  ["GET /api/seasons/2026/current-scoreboard", async () => (await import("@/app/api/seasons/[year]/current-scoreboard/route")).GET(new Request("https://x"), year)],
  ["GET /api/seasons/2026/predictions", async () => (await import("@/app/api/seasons/[year]/predictions/route")).GET(new Request("https://x"), year)],
  ["GET /api/my-rank", async () => (await import("@/app/api/my-rank/route")).GET(new Request("https://x/api/my-rank?year=2026"))],
  ["GET /api/commentators/u7", async () => (await import("@/app/api/commentators/[slug]/route")).GET(new Request("https://x/api/commentators/u7"), { params: Promise.resolve({ slug: "u7" }) })],
  ["scoreboard page data", async () => (await import("@/lib/scoreboard")).getScoreboardData(2026)],
  ["home / rankings results", async () => (await import("@/lib/season-results-data")).loadSeasonResults(2026, "all")],
  ["SEO top commentators", async () => (await import("@/lib/commentator-queries")).getTopCommentatorsForYear(2026, 20)],
  ["archive predictions", async () => (await import("@/lib/seo-queries")).getSeasonPredictions(3, 2026)],
];

describe(`D1 rows_read per warm request stays under ${BUDGET} with ${PREDICTIONS_PER_SEASON} predictions/season`, () => {
  it.each(endpoints)("%s", async (label, call) => {
    log = [];
    const first = await call();
    if (first instanceof Response) expect(first.status).toBe(200);
    const cold = await rowsRead();
    log = [];
    await call();
    const warm = await rowsRead();
    // D1_BUDGET_REPORT=<file> records the numbers quoted in the PR estimate.
    if (process.env.D1_BUDGET_REPORT) {
      const largest = await real.prepare("SELECT key, length(value) AS size FROM computed_cache ORDER BY size DESC LIMIT 1").first<{ key: string; size: number }>();
      appendFileSync(process.env.D1_BUDGET_REPORT, `${label}\tcold=${cold}\twarm=${warm}\tlargest=${largest?.key}:${largest?.size}\n`);
    }
    expect(warm).toBeLessThanOrEqual(BUDGET);
  }, 120_000);

  it("a data change triggers one recompute, then reads drop back under budget", async () => {
    const call = endpoints[3][1];
    await call();
    await real.prepare("UPDATE actual_team_standings SET rank = rank WHERE season_id = 3 AND rank = 1").run();
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 1_801_000); // past the per-key recompute window
    log = [];
    await call(); // the request that claims the stale row recomputes
    expect(await rowsRead()).toBeGreaterThan(BUDGET);
    log = [];
    await call();
    expect(await rowsRead()).toBeLessThanOrEqual(BUDGET);
    vi.restoreAllMocks();
  }, 120_000);
});
