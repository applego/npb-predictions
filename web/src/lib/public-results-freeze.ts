import { createHash } from "node:crypto";
import { z } from "zod";
import { canonicalPredictions, PUBLIC_RESULTS_SELECTION } from "./canonical-prediction";
import { latestResultSnapshot, summarizeResults, type PublicResultPick, type ResultStanding } from "./season-results";

const id = z.number().int().positive();
const count = z.number().int().nonnegative();
const date = z.iso.datetime();
const league = z.enum(["central", "pacific"]);
const ranking = z.strictObject({ league, rank: z.number().int(), teamName: z.string() });
const standing = ranking.extend({ snapshotDate: date, isFinal: z.boolean() });
const exportSchema = z.strictObject({
  schema: z.literal("npb-public-results-export.v1"), year: z.number().int(), seasonId: id,
  seasonLockDate: date.nullable(), selectionRule: z.literal(PUBLIC_RESULTS_SELECTION),
  population: z.strictObject({
    kind: z.literal("season-locked-commentators"), league: z.literal("all"),
    commentators: count, predictions: count, selectedPredictions: count,
    eligible: z.strictObject({ central: count, pacific: count, all: count }),
    includes: z.string(), excludes: z.string(),
  }),
  limitations: z.array(z.string()),
  predictions: z.array(z.strictObject({
    predictionId: id, userId: id, name: z.string(), slug: z.string(),
    personSource: z.string().nullable(), personSourceUrl: z.url().nullable(),
    variant: z.string().nullable(), isLocked: z.literal(true),
    lockedAt: date.nullable(), createdAt: date, rankings: z.array(ranking), selected: z.boolean(),
  })),
  snapshots: z.array(z.strictObject({
    league, status: z.enum(["final", "provisional", "unavailable"]),
    updatedAt: date.nullable(), stale: z.boolean(), rows: z.array(standing),
  })).length(2),
  provenance: z.strictObject({
    sourceUrl: z.url(), observedAt: date, payloadHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    hashScope: z.literal("JSON.stringify(response without provenance), UTF-8"),
  }),
});
export type PublicResultsExport = z.infer<typeof exportSchema>;

/** Validate the original object without reordering keys covered by its payload hash. */
export function verifyPublicResultsExport(raw: string, year: number): PublicResultsExport {
  const input: unknown = JSON.parse(raw);
  exportSchema.parse(input);
  const data = input as PublicResultsExport;
  const { provenance, ...payload } = data;
  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  if (provenance.payloadHash !== `sha256:${hash}`) throw new Error("Public export payload hash mismatch");
  const source = new URL(provenance.sourceUrl);
  if (data.year !== year || source.origin !== "https://npb-predictions.pages.dev" || source.pathname !== "/api/rankings/commentators" ||
    source.searchParams.get("year") !== String(year) || source.searchParams.get("league") !== "all" ||
    source.searchParams.get("format") !== "archive") throw new Error("Public export year/source mismatch");
  if (new Set(data.predictions.map((row) => row.predictionId)).size !== data.predictions.length) throw new Error("Duplicate prediction ID");
  const selected = new Set(canonicalPredictions(data.predictions).map((row) => row.predictionId));
  if (data.predictions.some((row) => row.selected !== selected.has(row.predictionId))) throw new Error("Noncanonical prediction selection");
  const population = data.population;
  if (population.predictions !== data.predictions.length || population.selectedPredictions !== selected.size ||
    population.commentators !== new Set(data.predictions.map((row) => row.userId)).size) throw new Error("Public export population mismatch");
  const standings = data.snapshots.flatMap((snapshot) => snapshot.rows);
  if (new Set(data.snapshots.map((row) => row.league)).size !== 2 ||
    data.snapshots.some((snapshot) => snapshot.rows.some((row) => row.league !== snapshot.league))) throw new Error("Public export snapshot scope mismatch");
  const picks = selectedPicks(data);
  for (const scope of ["central", "pacific", "all"] as const) {
    if (summarizeResults(picks, standings, scope, Date.parse(provenance.observedAt)).eligible !== population.eligible[scope]) throw new Error("Public export eligibility mismatch");
  }
  return data;
}

function selectedPicks(data: PublicResultsExport): PublicResultPick[] {
  return data.predictions.filter((person) => person.selected).flatMap((person) => person.rankings.map((row) => ({
    ...row, predictionId: person.predictionId, userId: person.userId, name: person.name, slug: person.slug,
    variant: person.variant, createdAt: person.createdAt, source: null, sourceUrl: null,
  })));
}

/** Freeze a verified full export; retain incomplete/empty candidates and missing lock evidence. */
export function freezePublicResults(raw: string, year: number, years: number[], official: ResultStanding[], observedAt: string) {
  const data = verifyPublicResultsExport(raw, year);
  if (!years.includes(year) || years.some((value) => !Number.isInteger(value))) throw new Error("Season list mismatch");
  date.parse(observedAt);
  const snapshots = (["central", "pacific"] as const).map((scope) => latestResultSnapshot(official, scope, Date.parse(observedAt)));
  if (official.length !== 12 || snapshots.some((snapshot) => snapshot.status !== "final")) throw new Error("Only official completed seasons may be archived");
  return {
    version: 2, year, observedAt, years,
    provenance: {
      predictionsUrl: data.provenance.sourceUrl, predictionsObservedAt: data.provenance.observedAt,
      predictionsSha256: createHash("sha256").update(raw).digest("hex"),
      predictionsPayloadHash: data.provenance.payloadHash,
      standingsUrls: [`https://npb.jp/bis/${year}/stats/std_c.html`, `https://npb.jp/bis/${year}/stats/std_p.html`],
    },
    population: data.population,
    publicExport: data,
    standings: snapshots.flatMap((snapshot) => snapshot.rows),
    commentators: data.predictions.filter((person) => person.selected).map((person) => ({
      userId: person.userId, name: person.name, slug: person.slug, variant: person.variant,
      predictionId: person.predictionId, createdAt: person.createdAt, isLocked: person.isLocked,
      lockedAt: person.lockedAt, rankings: person.rankings,
    })),
  };
}
