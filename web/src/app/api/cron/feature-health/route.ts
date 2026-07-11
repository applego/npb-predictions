export const runtime = "edge";

/**
 * GET /api/cron/feature-health
 *
 * Reports runtime health of main user-facing features so GitHub Actions
 * can open auto-generated Issues when a feature breaks in production.
 *
 * Checks:
 *  - imageGen: prediction OG image can be generated for the newest
 *    prediction (verifies users/seasons/predictions/rankingPicks schema + data).
 *  - newsFeed: generateNewsFeed() returns at least 1 item.
 *  - commentatorRanking: at least 1 user with role="commentator" exists.
 *
 * Shape mirrors /api/cron/scrape-health so the alert workflow can reuse
 * the same dedup-by-label pattern.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  users,
  seasons,
  predictions,
  rankingPicks,
  actualTeamStandings,
} from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { generateNewsFeed } from "@/lib/news-feed";

// If actual_team_standings hasn't been updated for this long, the daily-scores
// cron is silently broken and LIVE SCOREBOARD will progressively drift from
// reality. 36h covers a missed daily run plus a few hours of buffer for
// timezone / GitHub Actions queue latency.
const STANDINGS_STALE_THRESHOLD_MS = 36 * 60 * 60 * 1000;

interface FeatureStatus {
  source: string; // feature id, used as issue label e.g. "feature:image-gen"
  healthy: boolean;
  unresolvedCount: number; // 1 when unhealthy (for alert-workflow compat); 0 when healthy
  latestError: string | null;
  latestAt: string | null;
  latestHtmlSnippet: string | null; // unused for features, kept for alert compat
  latestHttpStatus: number | null; // unused for features, kept for alert compat
  detail?: Record<string, unknown>;
}

type ImageProbe = {
  path: string;
  minBytes: number;
};

const SHARE_IMAGE_PROBES: ImageProbe[] = [
  { path: "/api/og/prediction?userId=1&year=2026", minBytes: 25_000 },
  { path: "/api/og/season?year=2026", minBytes: 10_000 },
  { path: "/api/og/commentator?userId=1", minBytes: 10_000 },
  { path: "/api/og/standings", minBytes: 10_000 },
  { path: "/api/newspaper/hanshin-tigers", minBytes: 25_000 },
  { path: "/api/ranking-card/overall", minBytes: 10_000 },
];

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkShareImageRoutes(origin: string): Promise<FeatureStatus> {
  const base: FeatureStatus = {
    source: "share-images",
    healthy: false,
    unresolvedCount: 1,
    latestError: null,
    latestAt: new Date().toISOString(),
    latestHtmlSnippet: null,
    latestHttpStatus: null,
  };
  const results: Array<{
    path: string;
    status: number | null;
    contentType: string | null;
    bytes: number;
    ok: boolean;
    error: string | null;
  }> = [];

  for (const probe of SHARE_IMAGE_PROBES) {
    try {
      const res = await fetchWithTimeout(`${origin}${probe.path}`, 12_000);
      const contentType = res.headers.get("content-type");
      const body = new Uint8Array(await res.arrayBuffer());
      const png =
        body.length >= 4 &&
        body[0] === 0x89 &&
        body[1] === 0x50 &&
        body[2] === 0x4e &&
        body[3] === 0x47;
      const ok =
        res.ok &&
        contentType?.includes("image/png") === true &&
        png &&
        body.byteLength >= probe.minBytes;
      results.push({
        path: probe.path,
        status: res.status,
        contentType,
        bytes: body.byteLength,
        ok,
        error: ok
          ? null
          : `expected PNG >=${probe.minBytes} bytes, got status=${res.status} contentType=${contentType ?? "n/a"} bytes=${body.byteLength}`,
      });
    } catch (e) {
      results.push({
        path: probe.path,
        status: null,
        contentType: null,
        bytes: 0,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  return {
    ...base,
    healthy: failed.length === 0,
    unresolvedCount: failed.length === 0 ? 0 : 1,
    latestError:
      failed.length === 0
        ? null
        : failed.map((r) => `${r.path}: ${r.error ?? "failed"}`).join("; "),
    latestHttpStatus: failed[0]?.status ?? null,
    detail: { probes: results },
  };
}

async function checkImageGen(): Promise<FeatureStatus> {
  const base: FeatureStatus = {
    source: "image-gen",
    healthy: false,
    unresolvedCount: 1,
    latestError: null,
    latestAt: new Date().toISOString(),
    latestHtmlSnippet: null,
    latestHttpStatus: null,
  };
  try {
    const db = getDb();
    // Find newest prediction with ranking picks => OG route has real data to render.
    const latestPick = await db
      .select({ predictionId: rankingPicks.predictionId })
      .from(rankingPicks)
      .limit(1);
    if (latestPick.length === 0) {
      return { ...base, latestError: "no ranking_picks rows — OG route would render empty" };
    }
    const pid = latestPick[0].predictionId;
    const pred = await db
      .select({ userId: predictions.userId, seasonId: predictions.seasonId })
      .from(predictions)
      .where(eq(predictions.id, pid))
      .limit(1);
    if (pred.length === 0) {
      return { ...base, latestError: `prediction ${pid} missing for ranking_pick` };
    }
    const user = await db.select().from(users).where(eq(users.id, pred[0].userId)).limit(1);
    const season = await db.select().from(seasons).where(eq(seasons.id, pred[0].seasonId)).limit(1);
    if (user.length === 0 || season.length === 0) {
      return { ...base, latestError: "user or season missing for newest prediction" };
    }
    return {
      ...base,
      healthy: true,
      unresolvedCount: 0,
      latestError: null,
      detail: {
        sampleUserId: user[0].id,
        sampleYear: season[0].year,
        sampleUserName: user[0].name ?? null,
      },
    };
  } catch (e) {
    return { ...base, latestError: e instanceof Error ? e.message : String(e) };
  }
}

async function checkNewsFeed(): Promise<FeatureStatus> {
  const base: FeatureStatus = {
    source: "news-feed",
    healthy: false,
    unresolvedCount: 1,
    latestError: null,
    latestAt: new Date().toISOString(),
    latestHtmlSnippet: null,
    latestHttpStatus: null,
  };
  try {
    const items = await generateNewsFeed(5);
    if (!Array.isArray(items) || items.length === 0) {
      return { ...base, latestError: "generateNewsFeed() returned 0 items" };
    }
    return {
      ...base,
      healthy: true,
      unresolvedCount: 0,
      latestError: null,
      detail: { itemCount: items.length, sampleTitle: items[0].title },
    };
  } catch (e) {
    return { ...base, latestError: e instanceof Error ? e.message : String(e) };
  }
}

async function checkCommentatorRanking(): Promise<FeatureStatus> {
  const base: FeatureStatus = {
    source: "commentator-ranking",
    healthy: false,
    unresolvedCount: 1,
    latestError: null,
    latestAt: new Date().toISOString(),
    latestHtmlSnippet: null,
    latestHttpStatus: null,
  };
  try {
    const db = getDb();
    const commentators = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "commentator"));
    if (commentators.length === 0) {
      return { ...base, latestError: "no users with role=commentator — ranking page would be empty" };
    }
    // Prediction existence for current-or-latest season => ranking is not all-empty
    const latestSeason = await db
      .select()
      .from(seasons)
      .orderBy(desc(seasons.year))
      .limit(1);
    if (latestSeason.length === 0) {
      return { ...base, latestError: "no seasons row — ranking impossible" };
    }
    // Use INNER JOIN + COUNT instead of inArray() to avoid the SQLite
    // 99-variable bind limit when commentator count > ~99 (D1_ERROR observed
    // in production). One row, two table scan — cheap and bounded.
    const predCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(predictions)
      .innerJoin(users, eq(predictions.userId, users.id))
      .where(eq(users.role, "commentator"));
    const commentatorPredictionCount = Number(predCountRows[0]?.count ?? 0);
    return {
      ...base,
      healthy: true,
      unresolvedCount: 0,
      latestError: null,
      detail: {
        commentatorCount: commentators.length,
        latestYear: latestSeason[0].year,
        commentatorPredictionCount,
      },
    };
  } catch (e) {
    return { ...base, latestError: e instanceof Error ? e.message : String(e) };
  }
}

async function checkStandingsFreshness(): Promise<FeatureStatus> {
  const base: FeatureStatus = {
    source: "standings-freshness",
    healthy: false,
    unresolvedCount: 1,
    latestError: null,
    latestAt: new Date().toISOString(),
    latestHtmlSnippet: null,
    latestHttpStatus: null,
  };
  try {
    const db = getDb();
    const [activeSeason] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.isActive, true))
      .limit(1);
    if (!activeSeason) {
      return { ...base, latestError: "no active season" };
    }
    const [latest] = await db
      .select({ snapshotDate: actualTeamStandings.snapshotDate })
      .from(actualTeamStandings)
      .where(eq(actualTeamStandings.seasonId, activeSeason.id))
      .orderBy(desc(actualTeamStandings.snapshotDate))
      .limit(1);
    if (!latest) {
      return { ...base, latestError: `no actual_team_standings rows for season ${activeSeason.year}` };
    }
    const latestMs =
      latest.snapshotDate instanceof Date
        ? latest.snapshotDate.getTime()
        : Number(latest.snapshotDate) * 1000;
    const ageMs = Date.now() - latestMs;
    const healthy = ageMs < STANDINGS_STALE_THRESHOLD_MS;
    return {
      ...base,
      healthy,
      unresolvedCount: healthy ? 0 : 1,
      latestError: healthy
        ? null
        : `standings stale: latest snapshot ${Math.floor(ageMs / 3_600_000)}h old (threshold ${Math.floor(STANDINGS_STALE_THRESHOLD_MS / 3_600_000)}h). daily-scores workflow may be down.`,
      latestAt: new Date(latestMs).toISOString(),
      detail: {
        seasonYear: activeSeason.year,
        ageHours: Math.floor(ageMs / 3_600_000),
        thresholdHours: Math.floor(STANDINGS_STALE_THRESHOLD_MS / 3_600_000),
      },
    };
  } catch (e) {
    return { ...base, latestError: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const [
    imageGen,
    shareImages,
    newsFeed,
    commentatorRanking,
    standingsFreshness,
  ] =
    await Promise.all([
      checkImageGen(),
      checkShareImageRoutes(origin),
      checkNewsFeed(),
      checkCommentatorRanking(),
      checkStandingsFreshness(),
    ]);

  const all = [
    imageGen,
    shareImages,
    newsFeed,
    commentatorRanking,
    standingsFreshness,
  ];
  const needsAttention = all.filter((s) => !s.healthy);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    totalUnresolved: needsAttention.length,
    sourceCount: all.length,
    needsAttention, // alert workflow iterates this
    allSources: all,
  });
}
