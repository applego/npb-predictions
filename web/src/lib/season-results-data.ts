import { and, desc, eq } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { publishedSeasonResults } from "./public-results-archive";
import { getDb } from "@/db";
import { actualTeamStandings, predictions, rankingPicks, seasons, users } from "@/db/schema";
import { summarizeResults, type PublicResultPick, type ResultScope, type ResultSummary } from "./season-results";

import { withPredictionSources } from "./result-provenance";

export interface ResultsData {
  coverage?: {
    kind: "public-archive"; observedAt: string; central: number; pacific: number;
    selectionEvidence?: { registrations: number; candidates: number; missingLockedAt: number };
  };
  year: number;
  years: number[];
  summary: ResultSummary;
  error: "unavailable" | "unknown-year" | null;
}

/** Read-only, server-side public projection. No private drafts or user email reach the client. */
export async function loadSeasonResults(requestedYear: number | undefined, scope: ResultScope): Promise<ResultsData> {
  const currentYear = new Date().getFullYear();
  const fallbackYear = requestedYear ?? currentYear;
  let years: number[] = [];
  try {
    // Production defaults to immutable completed-season data. Fixture journeys opt out explicitly.
    const env = getRequestContext().env as { PUBLIC_RESULTS_ARCHIVE?: string };
    const published = env.PUBLIC_RESULTS_ARCHIVE === "0" ? null : publishedSeasonResults(fallbackYear, scope);
    if (published) return published;
    const db = getDb();
    const available = await db.select({ id: seasons.id, year: seasons.year }).from(seasons).orderBy(desc(seasons.year));
    years = available.map((s) => s.year);
    const season = requestedYear === undefined
      ? available.find((s) => s.year === currentYear) ?? available.find((s) => s.year <= currentYear)
      : available.find((s) => s.year === requestedYear);
    if (!season) return { year: fallbackYear, years, summary: summarizeResults([], [], scope), error: requestedYear === undefined ? "unavailable" : "unknown-year" };
    const [standingRows, pickRows] = await Promise.all([
      db.select().from(actualTeamStandings).where(eq(actualTeamStandings.seasonId, season.id)),
      db.select({
        predictionId: predictions.id, userId: users.id, name: users.name, slug: users.slug,
        source: users.source, sourceUrl: users.sourceUrl, variant: predictions.variant,
        createdAt: predictions.createdAt, league: rankingPicks.league, rank: rankingPicks.rank, teamName: rankingPicks.teamName,
      }).from(predictions)
        .innerJoin(users, eq(predictions.userId, users.id))
        .innerJoin(rankingPicks, eq(rankingPicks.predictionId, predictions.id))
        .where(and(eq(predictions.seasonId, season.id), eq(users.role, "commentator"), eq(predictions.isLocked, true))),
    ]);
    const publicPicks: PublicResultPick[] = pickRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
    const standings = standingRows.map((row) => ({ ...row, snapshotDate: row.snapshotDate.toISOString() }));
    return { year: season.year, years, summary: summarizeResults(withPredictionSources(publicPicks, season.year, scope), standings, scope), error: null };
  } catch (error) {
    console.error("Public season results unavailable", error instanceof Error ? error.message : "unknown");
    return { year: fallbackYear, years, summary: summarizeResults([], [], scope), error: "unavailable" };
  }
}
