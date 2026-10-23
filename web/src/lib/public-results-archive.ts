import archive from "../../../data/public-results-2026.json";
import { summarizeResults, type PublicResultPick, type ResultScope, type ResultStanding } from "./season-results";
import { withPredictionSources } from "./result-provenance";
import type { ResultsData } from "./season-results-data";
import type { freezePublicResults } from "./public-results-freeze";

type PublishedArchive = typeof archive | ReturnType<typeof freezePublicResults>;

/** Immutable, already-public season review. No D1 reads, private users, or mutable drafts. */
export function publishedSeasonResults(year: number, scope: ResultScope): ResultsData | null {
  return seasonResultsFromArchive(archive, year, scope);
}

/** Both archive formats keep their own population and evidence boundary. */
export function seasonResultsFromArchive(saved: PublishedArchive, year: number, scope: ResultScope): ResultsData | null {
  if (year !== saved.year) return null;
  const full = "publicExport" in saved ? saved.publicExport : null;
  // Use the verified export as SSOT; the convenience projection is not a second selection source.
  const people = full ? full.predictions.filter((person) => person.selected) : saved.commentators;
  const picks: PublicResultPick[] = people.flatMap((person) => person.rankings.map((row) => ({
    // Projection identity groups one already-published entry per commentator; never used as a DB key.
    predictionId: "predictionId" in person && typeof person.predictionId === "number" ? person.predictionId : person.userId,
    userId: person.userId, name: person.name, slug: person.slug,
    variant: person.variant, source: null, sourceUrl: null, createdAt: "createdAt" in person && typeof person.createdAt === "string" ? person.createdAt : "",
    league: row.league as "central" | "pacific", rank: row.rank, teamName: row.teamName,
  })));
  const standings = saved.standings as ResultStanding[];
  const summary = summarizeResults(withPredictionSources(picks, year, scope), standings, scope);
  if (summary.status !== "final" || (!full && !summary.eligible)) return null;
  // Empty canonical entries have no picks, but still belong to the observed population.
  summary.excluded = people.length - summary.eligible;
  summary.entries.forEach((entry) => { entry.populationLabel = "公開保存分内"; });
  return { year, years: saved.years, summary, error: null, coverage: {
    kind: "public-archive", observedAt: saved.provenance.predictionsObservedAt,
    central: scope === "central" ? summary.eligible : summarizeResults(picks, standings, "central").eligible,
    pacific: scope === "pacific" ? summary.eligible : summarizeResults(picks, standings, "pacific").eligible,
    ...(full ? { selectionEvidence: {
      registrations: full.population.selectedPredictions, candidates: full.population.predictions,
      missingLockedAt: full.predictions.filter((person) => person.selected && person.lockedAt === null).length,
    } } : {}),
  } };
}
