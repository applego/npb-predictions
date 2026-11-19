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
  // Title snapshots for the 2026 season: 2 leagues x 6 categories x 60 days.
  for (const league of ["central", "pacific"] as const) {
    for (const category of ["batting_avg", "rbi", "home_runs", "wins", "era", "saves"]) {
      for (let day = 0; day < 60; day++) {
        add("INSERT INTO actual_title_snapshots (season_id, league, category, player_name, team_name, value, snapshot_date) VALUES (3, ?, ?, ?, ?, ?, ?)",
          league, category, `選手${day % 12}`, "巨人", 0.3, 1_700_000_000 + day * 86_400);
      }
    }
  }
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
  ["GET /api/seasons/2026/titles", async () => (await import("@/app/api/seasons/[year]/titles/route")).GET(new Request("https://x"), year)],
  ["GET /api/users/7/history", async () => (await import("@/app/api/users/[userId]/history/route")).GET(new Request("https://x"), { params: Promise.resolve({ userId: "7" }) })],
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

  it("a scoreboard recompute reads the season's standings about once, not once per standings row", async () => {
    const call = endpoints.find(([label]) => label === "scoreboard page data")![1];
    await call();
    // A season of daily snapshots (production 2026: 804 rows), all older than the latest one.
    const history: D1PreparedStatement[] = [];
    for (let day = 1; day <= 60; day++) {
      for (const league of ["central", "pacific"]) {
        for (let rank = 1; rank <= 6; rank++) {
          history.push(real.prepare("INSERT INTO actual_team_standings (season_id, league, rank, team_name, snapshot_date) VALUES (3, ?, ?, ?, ?)").bind(league, rank, `old-${rank}`, 1_700_000_000 - day * 86_400));
        }
      }
    }
    await real.batch(history);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1_801_000);
    log = [];
    await call();
    vi.restoreAllMocks();
    const standingsReads = log.filter((s) => /^\s*select/i.test(s.sql) && s.sql.includes('from "actual_team_standings"'));
    expect(standingsReads.length).toBeGreaterThan(0);
    let read = 0;
    for (const s of standingsReads) read += (await real.prepare(s.sql).bind(...s.params).all()).meta.rows_read ?? 0;
    const rows = (await real.prepare("SELECT count(*) AS n FROM actual_team_standings WHERE season_id = 3").first<{ n: number }>())!.n;
    expect(read).toBeLessThanOrEqual(4 * rows);
  }, 120_000);

  it("OG top 5 recompute reads a page of snapshots, not the season", async () => {
    const { getSeasonTop5 } = await import("@/lib/og-snapshots");
    log = [];
    const top = await getSeasonTop5(boundary.getDb(), 3);
    expect(top).toHaveLength(5);
    expect(await rowsRead()).toBeLessThanOrEqual(BUDGET);
    // Each returned score is that user's best, and together they are the
    // five largest per-user bests (multiset compare: ties are interchangeable).
    const all = (await real.prepare("SELECT user_id, total_score FROM score_snapshots WHERE season_id = 3").all<{ user_id: number; total_score: number }>()).results;
    const bestByUser = new Map<number, number>();
    for (const r of all) bestByUser.set(r.user_id, Math.max(bestByUser.get(r.user_id) ?? -1, r.total_score));
    for (const entry of top) expect(entry.totalScore).toBe(bestByUser.get(entry.userId));
    const expectedTotals = [...bestByUser.values()].sort((a, b) => b - a).slice(0, 5);
    expect(top.map((t) => t.totalScore).sort((a, b) => b - a)).toEqual(expectedTotals);
  }, 120_000);

  it("OG weekly changes recompute reads two snapshot days, not the season", async () => {
    const { getSeasonWeeklyChanges } = await import("@/lib/og-snapshots");
    log = [];
    const weekly = await getSeasonWeeklyChanges(boundary.getDb(), 3);
    expect(weekly).not.toBeNull();
    expect(weekly!.changes).toHaveLength(5);
    const read = await rowsRead();
    const latest = (await real.prepare("SELECT max(snapshot_date) AS v FROM score_snapshots WHERE season_id = 3").first<{ v: number }>())!.v;
    const prev = (await real.prepare("SELECT max(snapshot_date) AS v FROM score_snapshots WHERE season_id = 3 AND snapshot_date <= ?").bind(latest - 7 * 86_400).first<{ v: number }>())!.v;
    const countOn = async (d: number) => (await real.prepare("SELECT count(*) AS n FROM score_snapshots WHERE season_id = 3 AND snapshot_date = ?").bind(d).first<{ n: number }>())!.n;
    const twoDays = (await countOn(latest)) + (await countOn(prev));
    // Two days of rows (the latest day is read joined to users, so ~2x for
    // that day), independent of how many snapshot days the season has.
    expect(read).toBeLessThanOrEqual(2 * twoDays + 100);
    expect(weekly!.latestMs).toBe(latest * 1000);
    expect(weekly!.weekAgoMs).toBe((latest - 7 * 86_400) * 1000);
    // Deltas match a brute-force full scan, as multisets and per user.
    const rows = (await real.prepare("SELECT user_id, total_score, snapshot_date FROM score_snapshots WHERE season_id = 3 ORDER BY snapshot_date DESC").all<{ user_id: number; total_score: number; snapshot_date: number }>()).results;
    const names = new Map((await real.prepare("SELECT id, name FROM users").all<{ id: number; name: string }>()).results.map((u) => [u.id, u.name]));
    const weekAgoSec = latest - 7 * 86_400;
    const latestByUser = new Map<number, number>();
    const prevByUser = new Map<number, number>();
    for (const r of rows) {
      if (!latestByUser.has(r.user_id)) latestByUser.set(r.user_id, r.total_score);
      if (r.snapshot_date <= weekAgoSec && !prevByUser.has(r.user_id)) prevByUser.set(r.user_id, r.total_score);
    }
    const brute = [...latestByUser.entries()].map(([uid, cur]) => ({ userName: names.get(uid)!, delta: cur - (prevByUser.get(uid) ?? 0) }));
    const bruteByName = new Map(brute.map((b) => [b.userName, b.delta]));
    for (const c of weekly!.changes) expect(c.delta).toBe(bruteByName.get(c.userName));
    expect(weekly!.changes.map((c) => c.delta).sort((a, b) => b - a))
      .toEqual(brute.map((b) => b.delta).sort((a, b) => b - a).slice(0, 5));
  }, 120_000);

  it("titles recompute reads the season's title snapshots about once, then serves from cache", async () => {
    const call = endpoints.find(([label]) => label === "GET /api/seasons/2026/titles")![1];
    await call(); // warm the key at the current counters
    await real.prepare("UPDATE actual_title_snapshots SET player_name = player_name WHERE id = (SELECT min(id) FROM actual_title_snapshots WHERE season_id = 3)").run();
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1_801_000); // past the per-key recompute window
    log = [];
    const res = await call() as Response;
    vi.restoreAllMocks();
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    const rows = (await real.prepare("SELECT count(*) AS n FROM actual_title_snapshots WHERE season_id = 3").first<{ n: number }>())!.n;
    expect(body).toHaveLength(rows);
    // The response IS the season's history, so a recompute cannot read less
    // than the table once — but it must not read it over and over.
    expect(await rowsRead()).toBeLessThanOrEqual(4 * rows + 100);
  }, 120_000);

  it("user history stays bounded however many snapshots the user has", async () => {
    const call = endpoints.find(([label]) => label === "GET /api/users/7/history")![1];
    log = [];
    const res = await call() as Response;
    expect(res.status).toBe(200);
    const body = await res.json() as { history: { year: number; totalScore: number }[] };
    expect(body.history.map((h) => h.year)).toEqual(SEASONS);
    expect(await rowsRead()).toBeLessThanOrEqual(BUDGET);
    for (const h of body.history) {
      const seasonId = SEASONS.indexOf(h.year) + 1;
      const best = (await real.prepare("SELECT max(total_score) AS v FROM score_snapshots WHERE user_id = 7 AND season_id = ?").bind(seasonId).first<{ v: number }>())!.v;
      expect(h.totalScore).toBe(best);
    }
  }, 120_000);
});
