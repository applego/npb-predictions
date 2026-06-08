export const runtime = "edge";

/**
 * GET /api/cron/scrape-health
 *
 * Reports scrape failure streaks so GitHub Actions can decide whether to
 * open an auto-generated Issue / br bead. No auth needed (read-only) but
 * we still accept the cron secret for symmetry with other cron endpoints.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { scrapeFailureEvents } from "@/db/schema";
import { desc, isNull } from "drizzle-orm";
import { needsScrapeAttention, type ScrapeSourceStatus } from "@/lib/scrape-health";

export async function GET() {
  const db = getDb();

  const rows = await db
    .select()
    .from(scrapeFailureEvents)
    .where(isNull(scrapeFailureEvents.resolvedAt))
    .orderBy(desc(scrapeFailureEvents.createdAt));

  // Group by source, keep the latest row per source
  const bySource = new Map<string, ScrapeSourceStatus>();
  for (const r of rows) {
    const key = r.source;
    const existing = bySource.get(key);
    if (!existing) {
      bySource.set(key, {
        source: key,
        unresolvedCount: 1,
        latestError: r.errorMessage,
        latestAt: r.createdAt.toISOString(),
        latestHtmlSnippet: r.htmlSnippet,
        latestHttpStatus: r.httpStatus,
      });
    } else {
      existing.unresolvedCount += 1;
    }
  }

  const summary = [...bySource.values()].sort(
    (a, b) => b.unresolvedCount - a.unresolvedCount,
  );
  const needsAttention = summary.filter((s) => needsScrapeAttention(s));

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    totalUnresolved: rows.length,
    sourceCount: summary.length,
    needsAttention,
    allSources: summary,
  });
}
