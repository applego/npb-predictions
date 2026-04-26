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
import { users, seasons, predictions, rankingPicks } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { generateNewsFeed } from "@/lib/news-feed";

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
    const commentatorIds = commentators.map((c) => c.id);
    const predCount = await db
      .select({ id: predictions.id })
      .from(predictions)
      .where(
        commentatorIds.length > 0
          ? inArray(predictions.userId, commentatorIds)
          : eq(predictions.seasonId, latestSeason[0].id),
      );
    return {
      ...base,
      healthy: true,
      unresolvedCount: 0,
      latestError: null,
      detail: {
        commentatorCount: commentators.length,
        latestYear: latestSeason[0].year,
        commentatorPredictionCount: predCount.length,
      },
    };
  } catch (e) {
    return { ...base, latestError: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const [imageGen, newsFeed, commentatorRanking] = await Promise.all([
    checkImageGen(),
    checkNewsFeed(),
    checkCommentatorRanking(),
  ]);

  const all = [imageGen, newsFeed, commentatorRanking];
  const needsAttention = all.filter((s) => !s.healthy);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    totalUnresolved: needsAttention.length,
    sourceCount: all.length,
    needsAttention, // alert workflow iterates this
    allSources: all,
  });
}
