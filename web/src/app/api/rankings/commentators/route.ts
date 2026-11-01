export const runtime = "edge";

import { NextResponse } from "next/server";
import { PUBLIC_CACHE_HEADERS } from "@/lib/computed-cache";
import { getCommentatorRankings } from "@/lib/commentator-rankings";
import { exportPublicResults } from "@/lib/public-results-export";

const DEFAULT_YEAR = 2026;

/**
 * GET /api/rankings/commentators?year=2025&league=all
 *
 * Computes commentator rankings on the fly from ranking_picks + actualTeamStandings.
 * No dependency on pre-computed scoreSnapshots.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const leagueParam = searchParams.get("league") ?? "all";
  const format = searchParams.get("format");

  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
  if ((yearParam !== null && !/^\d{4}$/.test(yearParam)) || !Number.isInteger(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  if (format !== null && format !== "archive") return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  if (!["all", "central", "pacific"].includes(leagueParam) || (format === "archive" && leagueParam !== "all")) {
    return NextResponse.json({ error: "Archive requires league=all; rankings require a valid league" }, { status: 400 });
  }
  if (format === "archive") {
    const source = new URL(req.url);
    source.search = new URLSearchParams({ year: String(year), league: "all", format: "archive" }).toString();
    try {
      const data = await exportPublicResults(year, source.href);
      return NextResponse.json(data ?? { error: "Season not found" }, {
        status: data ? 200 : 404, headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return NextResponse.json({ error: "Public results export unavailable; retry after source recovery" }, {
        status: 503, headers: { "Cache-Control": "no-store" },
      });
    }
  }

  const body = await getCommentatorRankings(year, leagueParam);
  if (!body) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }
  return NextResponse.json(body, { headers: PUBLIC_CACHE_HEADERS });
}
