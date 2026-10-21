import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { actualTeamStandings, predictions, rankingPicks, seasons, users } from "@/db/schema";
import { canonicalPredictions } from "./canonical-prediction";
import { latestResultSnapshot, safeSourceUrl, summarizeResults, type PublicResultPick } from "./season-results";

export const PUBLIC_RESULTS_SELECTION = "locked-commentators:original-first,createdAt-ascending,predictionId-ascending;before-league-or-score";

/** Full locked-commentator population, including one-league and incomplete entries.
 * Explicit columns exclude private user identity and unlocked prediction drafts.
 * Never substitute the earlier partial archive for this live export.
 */
export async function exportPublicResults(year: number, sourceUrl: string) {
  const db = getDb();
  const [season] = await db.select({ id: seasons.id, year: seasons.year, lockDate: seasons.lockDate })
    .from(seasons).where(eq(seasons.year, year));
  if (!season) return null;
  const rows = await db.select({
    predictionId: predictions.id, userId: users.id, name: users.name, slug: users.slug,
    source: users.source, sourceUrl: users.sourceUrl, variant: predictions.variant,
    isLocked: predictions.isLocked, lockedAt: predictions.lockedAt, createdAt: predictions.createdAt,
    league: rankingPicks.league, rank: rankingPicks.rank, teamName: rankingPicks.teamName,
  }).from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .leftJoin(rankingPicks, eq(rankingPicks.predictionId, predictions.id))
    .where(and(eq(predictions.seasonId, season.id), eq(users.role, "commentator"), eq(predictions.isLocked, true)))
    .orderBy(asc(predictions.id), asc(rankingPicks.league), asc(rankingPicks.rank));
  const standingRows = await db.select({
    league: actualTeamStandings.league, rank: actualTeamStandings.rank,
    teamName: actualTeamStandings.teamName, snapshotDate: actualTeamStandings.snapshotDate,
    isFinal: actualTeamStandings.isFinal,
  }).from(actualTeamStandings).where(eq(actualTeamStandings.seasonId, season.id));
  const candidates = new Map<number, {
    predictionId: number; userId: number; name: string; slug: string;
    personSource: string | null; personSourceUrl: string | null; variant: string | null;
    isLocked: boolean; lockedAt: string | null; createdAt: string;
    rankings: { league: "central" | "pacific"; rank: number; teamName: string }[];
  }>();
  for (const row of rows) {
    if (!candidates.has(row.predictionId)) candidates.set(row.predictionId, {
      predictionId: row.predictionId, userId: row.userId, name: row.name, slug: row.slug,
      personSource: row.source, personSourceUrl: safeSourceUrl(row.sourceUrl), variant: row.variant,
      isLocked: row.isLocked, lockedAt: row.lockedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), rankings: [],
    });
    if (row.league !== null && row.rank !== null && row.teamName !== null) {
      candidates.get(row.predictionId)!.rankings.push({ league: row.league, rank: row.rank, teamName: row.teamName });
    }
  }
  const selected = new Set(canonicalPredictions([...candidates.values()]).map((row) => row.predictionId));
  const exported = [...candidates.values()].map((row) => ({ ...row, selected: selected.has(row.predictionId) }));
  const picks: PublicResultPick[] = exported.filter((person) => person.selected).flatMap((person) => person.rankings.map((row) => ({
    ...row, predictionId: person.predictionId, userId: person.userId, name: person.name, slug: person.slug,
    variant: person.variant, createdAt: person.createdAt, source: null, sourceUrl: null,
  })));
  const standings = standingRows.map((row) => ({ ...row, snapshotDate: row.snapshotDate.toISOString() }));
  const snapshots = (["central", "pacific"] as const).map((league) => latestResultSnapshot(standings, league));
  const payload = {
    schema: "npb-public-results-export.v1", year: season.year, seasonId: season.id,
    seasonLockDate: season.lockDate?.toISOString() ?? null,
    selectionRule: PUBLIC_RESULTS_SELECTION,
    population: {
      kind: "season-locked-commentators", league: "all",
      commentators: new Set(exported.map((row) => row.userId)).size, predictions: exported.length,
      selectedPredictions: selected.size,
      eligible: Object.fromEntries((["central", "pacific", "all"] as const).map((scope) =>
        [scope, summarizeResults(picks, standings, scope).eligible])),
      includes: "one-league, incomplete and empty locked entries; all locked variants",
      excludes: "friends, system users, unlocked drafts, commentators without a locked season entry",
    },
    limitations: [
      "isLocked is the current database flag; lockedAt=null is missing evidence, not a historical lock attestation",
      "personSource fields are person metadata, not verified citations for this year/league/variant",
      "complete for the defined query population at observation; not all registered users or the earlier partial archive",
    ],
    predictions: exported, snapshots,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((value) => value.toString(16).padStart(2, "0")).join("");
  return { ...payload, provenance: { sourceUrl, observedAt: new Date().toISOString(),
    payloadHash: `sha256:${hash}`, hashScope: "JSON.stringify(response without provenance), UTF-8" } };
}
