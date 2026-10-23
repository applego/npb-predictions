import { beforeEach, describe, expect, it, vi } from "vitest";
import { NPB_TEAMS } from "../teams";
const mocks = vi.hoisted(() => ({ active: [{ id: 3, year: 2026 }], previous: [] as { league: string; isFinal: boolean; snapshotDate?: Date }[], batches: 0, saved: [] as Record<string, unknown>[][], scrape: vi.fn(), auth: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({
  select: () => ({ from: () => ({ where: () => Object.assign(Promise.resolve(mocks.active), { orderBy: () => ({ limit: async () => mocks.previous }) }) }) }),
  batch: async (queries: Record<string, unknown>[][]) => { mocks.batches++; mocks.saved.push(...queries); },
  insert: () => ({ values: (rows: Record<string, unknown>[]) => ({ onConflictDoNothing: () => rows }) }),
}) }));
vi.mock("@/lib/auth-server", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/scrape-npb", () => ({ scrapeNpbStandings: mocks.scrape }));
import { POST } from "@/app/api/admin/scrape-standings/route";
beforeEach(() => { mocks.active = [{ id: 3, year: 2026 }]; mocks.saved = []; mocks.previous = []; mocks.batches = 0; mocks.auth.mockResolvedValue({}); mocks.scrape.mockReset(); });
describe("official standings ingestion entrypoint", () => {
  it("preserves official completion with a single timestamp and bounded inserts", async () => {
    mocks.scrape.mockResolvedValue(NPB_TEAMS.map((team, i) => ({ league: team.league, rank: i % 6 + 1, teamName: team.name, wins: 70, losses: 70, draws: 3, isFinal: true })));
    expect((await POST(new Request('https://example.com/api/admin/scrape-standings', { method: 'POST' }))).status).toBe(200);
    expect(mocks.scrape).toHaveBeenCalledWith(2026);
    expect(mocks.batches).toBe(1);
    expect(mocks.saved.map((rows) => rows.length)).toEqual([8, 4]);
    expect(mocks.saved.flat().every((row) => row.isFinal === true && row.seasonId === 3)).toBe(true);
    expect(new Set(mocks.saved.flat().map((row) => (row.snapshotDate as Date).getTime())).size).toBe(1);
  });
  it("does not downgrade a final league", async () => {
    mocks.previous = [{ league: "central", isFinal: true }];
    mocks.scrape.mockResolvedValue(NPB_TEAMS.map((team, i) => ({ league: team.league, rank: i % 6 + 1, teamName: team.name, wins: 70, losses: 70, draws: 3, isFinal: false })));
    expect((await POST(new Request('https://example.com'))).status).toBe(409);
    expect(mocks.batches).toBe(0);
  });
  it("rejects multiple active years and denied admins before writing", async () => {
    mocks.active = [{ id: 3, year: 2026 }, { id: 4, year: 2027 }];
    expect((await POST(new Request('https://example.com'))).status).toBe(409);
    expect(mocks.scrape).not.toHaveBeenCalled();expect(mocks.saved).toHaveLength(0);
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await POST(new Request('https://example.com'))).status).toBe(401);
  });
});

vi.mock("@/lib/cron-auth", () => ({ checkCronAuth: () => ({ authorized: true }) }));
vi.mock("@/lib/scrape-yahoo", () => ({ scrapeYahooStandings: vi.fn() }));
vi.mock("@/lib/scrape-retry", () => ({
  withRetry: async (fn: () => Promise<unknown>) => ({ ok: true, value: await fn(), attempts: 1 }),
  markSourceResolved: vi.fn(), logScrapeFailure: vi.fn(),
}));
import { POST as cronPOST } from "@/app/api/cron/update-standings/route";
describe("scheduled standings ingestion", () => {
  it("repairs an incomplete latest snapshot even when the combined team diff is unchanged", async () => {
    const incoming = NPB_TEAMS.map((team, i) => ({ league: team.league, rank: i % 6 + 1, teamName: team.name, wins: 70, losses: 70, draws: 3, isFinal: true }));
    mocks.scrape.mockResolvedValue(incoming);
    mocks.previous = incoming.map((row, i) => ({ ...row, snapshotDate: new Date(i < 8 ? '2026-10-20' : '2026-10-19') }));
    const response = await cronPOST(new Request('https://example.com'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ seasons: [{ inserted: true, changed: 0 }] });
    expect(mocks.batches).toBe(1);
    expect(mocks.saved.flat()).toHaveLength(12);
  });
  it("refuses provisional data after completion before writing", async () => {
    mocks.previous = [{ league: 'central', isFinal: true, snapshotDate: new Date('2026-10-20') }];
    mocks.scrape.mockResolvedValue(NPB_TEAMS.map((team, i) => ({ league: team.league, rank: i % 6 + 1, teamName: team.name, wins: 70, losses: 70, draws: 3, isFinal: false })));
    expect((await cronPOST(new Request('https://example.com'))).status).toBe(409);
    expect(mocks.batches).toBe(0);
  });
});
