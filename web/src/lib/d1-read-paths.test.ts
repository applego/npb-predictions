// D1 bills every row a query scans. These entrypoints used to read whole tables
// (ranking_picks, score_snapshots) per request and exhausted the account-wide
// daily read quota. The schema comes from the real drizzle migrations, so the
// query plans below are the ones D1 (SQLite) will choose in production.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NPB_TEAMS } from "@/lib/teams";

const boundary = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/db", () => ({ getDb: boundary.getDb }));
import { GET as commentatorDetail } from "@/app/api/commentators/[slug]/route";
import { GET as allTime } from "@/app/api/rankings/all-time/route";
import { GET as newsApi } from "@/app/api/news/route";
import { getTopCommentatorsForYear } from "@/lib/commentator-queries";
import { generateNewsFeed } from "@/lib/news-feed";
import { getOrCompute } from "@/lib/computed-cache";

const MIGRATIONS = resolve(__dirname, "../../drizzle");
const HEAVY_TABLES = /^SCAN (ranking_picks|title_picks|score_snapshots|ss|predictions)\b/;
const SEASONS = [[101, 2024], [102, 2025], [103, 2026]] as const;

type Stmt = { sql: string; params: unknown[] };
let sqlite: DatabaseSync;
let log: Stmt[];

function run(sql: string, params: unknown[], method: string) {
  log.push({ sql, params });
  const statement = sqlite.prepare(sql);
  if (method === "run") { statement.run(...(params as never[])); return { rows: [] }; }
  statement.setReturnArrays(true);
  const rows = statement.all(...(params as never[])) as unknown as unknown[][];
  return { rows: method === "get" ? (rows[0] ?? undefined) as never : rows };
}

/** Full-table scans of the big tables in the statements issued since the last reset. */
function heavyScans(): string[] {
  return log
    .filter((s) => /^\s*select/i.test(s.sql))
    .flatMap((s) => (sqlite.prepare(`EXPLAIN QUERY PLAN ${s.sql}`).all(...(s.params as never[])) as { detail: string }[])
      .map((row) => row.detail)
      .filter((detail) => HEAVY_TABLES.test(detail))
      .map((detail) => `${detail}  <=  ${s.sql.slice(0, 90)}`));
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(resolve(MIGRATIONS, file), "utf8"));
  }
  const insertSeason = sqlite.prepare("INSERT INTO seasons (id, year, label, is_active) VALUES (?, ?, ?, ?)");
  for (const [id, year] of SEASONS) insertSeason.run(id, year, String(year), year === 2026 ? 1 : 0);

  // 山田①/山田② are two variants of one commentator (news spotlight).
  const names = ["山田①", "山田②", "佐藤", "鈴木", "高橋", "田中"];
  const insertUser = sqlite.prepare("INSERT INTO users (id, name, slug, role) VALUES (?, ?, ?, 'commentator')");
  names.forEach((name, i) => insertUser.run(1000 + i, name, `c${i}`));

  const insertPred = sqlite.prepare("INSERT INTO predictions (id, user_id, season_id, is_locked, created_at) VALUES (?, ?, ?, 1, ?)");
  const insertPick = sqlite.prepare("INSERT INTO ranking_picks (prediction_id, league, rank, team_name) VALUES (?, ?, ?, ?)");
  const insertTitle = sqlite.prepare("INSERT INTO title_picks (prediction_id, league, category, player_name) VALUES (?, ?, 'home_runs', ?)");
  const insertStanding = sqlite.prepare("INSERT INTO actual_team_standings (season_id, league, rank, team_name, snapshot_date, is_final) VALUES (?, ?, ?, ?, ?, 1)");
  let predId = 0;
  for (const [seasonId] of SEASONS) {
    for (const league of ["central", "pacific"] as const) {
      NPB_TEAMS.filter((t) => t.league === league).forEach((team, i) => insertStanding.run(seasonId, league, i + 1, team.name, 1_700_000_000));
    }
    names.forEach((_, u) => {
      predId += 1;
      insertPred.run(predId, 1000 + u, seasonId, 1_700_000_000 + predId);
      insertTitle.run(predId, "central", `選手${predId}`);
      for (const league of ["central", "pacific"] as const) {
        const teams = NPB_TEAMS.filter((t) => t.league === league);
        // rotate by user so each commentator gets a different number of hits
        teams.forEach((_, r) => insertPick.run(predId, league, r + 1, teams[(r + u) % teams.length].name));
      }
    });
  }

  // Daily snapshots: a user's best is NOT their latest, and best differs per user.
  const insertScore = sqlite.prepare("INSERT INTO score_snapshots (user_id, season_id, total_score, snapshot_date) VALUES (?, ?, ?, ?)");
  for (const [seasonId] of SEASONS) {
    names.forEach((_, u) => {
      for (let day = 0; day < 5; day++) {
        const peak = day === 2 ? 100 - u * 7 : 0;
        insertScore.run(1000 + u, seasonId, peak + day, 1_700_000_000 + day * 86_400);
      }
    });
  }

  log = [];
  boundary.getDb.mockReset().mockReturnValue(drizzle(
    async (sql, params, method) => run(sql, params, method),
    async (batch) => batch.map((q) => run(q.sql, q.params, q.method)),
  ));
});
afterEach(() => sqlite.close());

describe("D1 read paths stay index-bounded", () => {
  it("commentator detail reads only that commentator's picks", async () => {
    const res = await commentatorDetail(new Request("https://x/api/commentators/c2"), { params: Promise.resolve({ slug: "c2" }) });
    const body = await res.json() as { seasons: { year: number }[] };
    expect(body.seasons.map((s) => s.year).sort()).toEqual([2024, 2025, 2026]);
    expect(heavyScans()).toEqual([]);
  });

  it("top commentators of a year read one season's picks, then come from cache", async () => {
    const top = await getTopCommentatorsForYear(2026, 3);
    expect(top[0]).toMatchObject({ name: "山田①", totalScore: 60 });
    expect(heavyScans()).toEqual([]);

    log = [];
    expect(await getTopCommentatorsForYear(2026, 3)).toEqual(top);
    expect(log.map((s) => s.sql)).toEqual([expect.stringContaining('"computed_cache"')]);
  });

  it("news feed stops at the newest season that fills the limit", async () => {
    const items = await generateNewsFeed(10);
    expect(items).toHaveLength(10);
    expect(items.every((item) => item.year === 2026)).toBe(true);
    expect(heavyScans()).toEqual([]);
    expect(log.some((s) => s.params.includes(101) || s.params.includes(102))).toBe(false);
  });

  it("news ranking and spotlight use each user's best score of that season", async () => {
    const items = await generateNewsFeed(200);
    const rankings = items.filter((i) => i.type === "ranking" && i.year === 2026).reverse();
    expect(rankings.map((i) => i.title)).toEqual([
      "2026年ランキング: 山田①が1位",
      "2026年ランキング: 山田②が2位",
      "2026年ランキング: 佐藤が3位",
    ]);
    expect(rankings.map((i) => i.body)).toEqual(["トータルスコア +102点。", "トータルスコア +95点。", "トータルスコア +88点。"]);
    const spotlight = items.find((i) => i.id === "spotlight-2026-山田");
    expect(spotlight?.body).toBe("複数の予想パターンを提出して最高+102点。");
  });

  it("all-time ranking and news API are served from one stored result", async () => {
    const first = await (await allTime()).json() as { totalCommentators: number };
    expect(first.totalCommentators).toBe(6);
    log = [];
    expect(await (await allTime()).json()).toEqual(first);
    expect(log.map((s) => s.sql)).toEqual([expect.stringContaining('"computed_cache"')]);

    const news = await (await newsApi(new Request("https://x/api/news?limit=5"))).json();
    log = [];
    expect(await (await newsApi(new Request("https://x/api/news?limit=5"))).json()).toEqual(news);
    expect(log).toHaveLength(1);
  });

  it("still serves data before the computed_cache migration is applied", async () => {
    sqlite.exec("DROP TABLE computed_cache");
    const body = await (await allTime()).json() as { totalCommentators: number };
    expect(body.totalCommentators).toBe(6);
  });
});

describe("computed_cache freshness", () => {
  const db = () => boundary.getDb();
  // Recomputes are rate-limited per key; move the clock past that window.
  let clock = Date.now();
  const later = () => { clock += 301_000; };
  beforeEach(() => {
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    // The change clock has millisecond resolution; start from a known value so
    // a write in the same millisecond as the seed still moves it.
    sqlite.exec("UPDATE data_changes SET changed_at = 0");
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("a write to scored data makes the next request recompute", async () => {
    let computes = 0;
    const compute = async () => ({ n: ++computes });
    expect(await getOrCompute(db(), "k", compute)).toEqual({ n: 1 });
    expect(await getOrCompute(db(), "k", compute)).toEqual({ n: 1 });
    sqlite.exec("UPDATE actual_team_standings SET rank = rank WHERE id = (SELECT min(id) FROM actual_team_standings)");
    expect(await getOrCompute(db(), "k", compute)).toEqual({ n: 1 }); // within the window: previous result
    later();
    expect(await getOrCompute(db(), "k", compute)).toEqual({ n: 2 });
    expect(await getOrCompute(db(), "k", compute)).toEqual({ n: 2 });
  });

  it("after a change, concurrent requests recompute once and the rest get the previous result", async () => {
    let computes = 0;
    await getOrCompute(db(), "k", async () => ({ n: ++computes }));
    sqlite.exec("INSERT INTO score_snapshots (user_id, season_id, total_score) VALUES (1000, 103, 1)");
    later();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const slow = getOrCompute(db(), "k", async () => { await gate; return { n: ++computes }; });
    await new Promise((r) => setTimeout(r, 10));
    const others = await Promise.all([1, 2, 3].map(() => getOrCompute(db(), "k", async () => ({ n: ++computes }))));
    expect(others).toEqual([{ n: 1 }, { n: 1 }, { n: 1 }]);
    release();
    expect(await slow).toEqual({ n: 2 });
    expect(computes).toBe(2);
  });

  it("a write during the compute leaves the new result stale", async () => {
    let computes = 0;
    await getOrCompute(db(), "k", async () => {
      computes++;
      await new Promise((r) => setTimeout(r, 5));
      sqlite.exec("UPDATE users SET name = name WHERE id = 1000");
      return computes;
    });
    later();
    await getOrCompute(db(), "k", async () => ++computes);
    expect(computes).toBe(2);
  });

  it("drafts and new sign-ups do not invalidate public aggregates", async () => {
    let computes = 0;
    await getOrCompute(db(), "k", async () => ++computes);
    sqlite.exec("INSERT INTO users (id, name, slug) VALUES (5000, '新規', 'new-user')");
    sqlite.exec("INSERT INTO predictions (id, user_id, season_id, is_locked) VALUES (9000, 5000, 103, 0)");
    sqlite.exec("INSERT INTO ranking_picks (prediction_id, league, rank, team_name) VALUES (9000, 'central', 1, '阪神')");
    later();
    await getOrCompute(db(), "k", async () => ++computes);
    expect(computes).toBe(1);
    sqlite.exec("UPDATE predictions SET is_locked = 1 WHERE id = 9000");
    later();
    await getOrCompute(db(), "k", async () => ++computes);
    expect(computes).toBe(2);
  });

  it("a change to one season recomputes that season's results and cross-season ones only", async () => {
    let computes = 0;
    const counted = () => async () => ++computes;
    await getOrCompute(db(), "y2026", counted(), { year: 2026 });
    await getOrCompute(db(), "y2025", counted(), { year: 2025 });
    await getOrCompute(db(), "all", counted());
    sqlite.exec("INSERT INTO actual_team_standings (season_id, league, rank, team_name, snapshot_date) VALUES (102, 'central', 1, '阪神', 1800000000)");
    later();
    expect(await getOrCompute(db(), "y2026", counted(), { year: 2026 })).toBe(1);
    expect(await getOrCompute(db(), "y2025", counted(), { year: 2025 })).toBe(4);
    expect(await getOrCompute(db(), "all", counted())).toBe(5);
    sqlite.exec("UPDATE users SET name = '改名' WHERE id = 1001"); // global: every season
    later();
    expect(await getOrCompute(db(), "y2026", counted(), { year: 2026 })).toBe(6);
  });

  it("does not store null results, so unknown keys cannot grow the table", async () => {
    await getOrCompute(db(), "missing", async () => null);
    expect(sqlite.prepare("SELECT count(*) AS n FROM computed_cache").get()).toEqual({ n: 0 });
  });
});
