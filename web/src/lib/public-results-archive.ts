import archive from "../../../data/public-results-2026.json";
import { summarizeResults, type PublicResultPick, type ResultScope, type ResultStanding } from "./season-results";
import { withPredictionSources } from "./result-provenance";
import type { ResultsData } from "./season-results-data";

/** Immutable, already-public season review. No D1 reads, private users, or mutable drafts. */
export function publishedSeasonResults(year: number, scope: ResultScope): ResultsData | null {
  if (year !== archive.year) return null;
  const picks: PublicResultPick[] = archive.commentators.flatMap((person) => person.rankings.map((row) => ({
    // Projection identity groups one already-published entry per commentator; never used as a DB key.
    predictionId: person.userId, userId: person.userId, name: person.name, slug: person.slug,
    variant: person.variant, source: null, sourceUrl: null, createdAt: "",
    league: row.league as "central" | "pacific", rank: row.rank, teamName: row.teamName,
  })));
  const summary = summarizeResults(withPredictionSources(picks, year, scope), archive.standings as ResultStanding[], scope);
  if (summary.status !== "final" || !summary.eligible) return null;
  summary.entries.forEach((entry) => { entry.populationLabel = "公開保存分内"; });
  return { year, years: archive.years, summary, error: null, coverage: {
    kind: "public-archive", observedAt: archive.provenance.predictionsObservedAt,
    central: archive.commentators.filter((person) => person.rankings.some((row) => row.league === "central")).length,
    pacific: archive.commentators.filter((person) => person.rankings.some((row) => row.league === "pacific")).length,
  } };
}
