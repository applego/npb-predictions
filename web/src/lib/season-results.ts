import { getTeamByName } from "./teams";
import { calcRankingPointForTeam } from "./scoring";
import { canonicalPredictions } from "./canonical-prediction";

export type ResultLeague = "central" | "pacific";
export type ResultScope = ResultLeague | "all";
export const RESULT_LEAGUES: ResultLeague[] = ["central", "pacific"];
export const RESULT_LABELS = { central: "セ・リーグ", pacific: "パ・リーグ", all: "セ・パ総合" };

export interface ResultStanding {
  league: ResultLeague;
  rank: number;
  teamName: string;
  snapshotDate: string;
  isFinal: boolean;
}
export interface PublicResultPick {
  predictionId: number; userId: number; name: string; slug: string;
  source: string | null; sourceUrl: string | null; variant: string | null;
  createdAt: string; league: ResultLeague; rank: number; teamName: string;
}
export interface ResultSnapshot {
  league: ResultLeague; status: "final" | "provisional" | "unavailable";
  updatedAt: string | null; stale: boolean; rows: ResultStanding[];
}
export interface ResultDetail {
  league: ResultLeague; teamName: string; predictedRank: number;
  actualRank: number; difference: number;
}
export interface ResultEntry {
  populationLabel?: string;
  userId: number; predictionId: number; name: string; slug: string;
  source: string | null; sourceUrl: string | null; variant: string | null;
  rank: number; exact: number; deviation: number; details: ResultDetail[];
}
/** Existing ranking-only points; player title points are a separate competition. */
export function resultPoints(entry: Pick<ResultEntry, "details">): number {
  return entry.details.reduce((sum, row) => sum + calcRankingPointForTeam(row.predictedRank, row.actualRank), 0);
}

export type ResultMetric = "points" | "exact" | "deviation";
/** Rank the full registration population before collapsing identical rows or searching. */
export function rankResultEntries(entries: ResultEntry[], metric: ResultMetric): ResultEntry[] {
  const value = (row: ResultEntry) => metric === "points" ? resultPoints(row) : metric === "exact" ? row.exact : -row.deviation;
  const sorted = [...entries].sort((a,b) => value(b) - value(a) || a.name.localeCompare(b.name, "ja") || a.userId - b.userId);
  let rank = 0;
  return sorted.map((row,index) => {
    if (index === 0 || value(sorted[index - 1]) !== value(row)) rank = index + 1;
    return { ...row, rank };
  });
}

export interface ResultSummary {
  scope: ResultScope; status: "final" | "provisional" | "unavailable";
  snapshots: ResultSnapshot[]; entries: ResultEntry[]; eligible: number;
  excluded: number; perfect: number | null; target: number;
}

export function safeSourceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function canonical(name: string, league: ResultLeague): string | null {
  const team = getTeamByName(name.trim());
  return team?.league === league ? team.name : null;
}
/** Never stitch an incomplete new snapshot together with older ranks. */
export function latestResultSnapshot(
  standings: ResultStanding[], league: ResultLeague, now: number = Date.now(),
): ResultSnapshot {
  const candidates = standings.filter((s) => s.league === league);
  const empty: ResultSnapshot = { league, status: "unavailable", updatedAt: null, stale: false, rows: [] };
  if (!candidates.length || candidates.some((s) => !Number.isFinite(Date.parse(s.snapshotDate)))) return empty;
  const newest = Math.max(...candidates.map((s) => Date.parse(s.snapshotDate)));
  if (newest > now + 5 * 60 * 1000) return empty;
  const latest = candidates.filter((s) => Date.parse(s.snapshotDate) === newest);
  const normalized = latest.map((s) => ({ ...s, teamName: canonical(s.teamName, league) }));
  const complete = normalized.length === 6 &&
    normalized.every((s) => s.teamName && Number.isInteger(s.rank) && s.rank >= 1 && s.rank <= 6) &&
    new Set(normalized.map((s) => s.rank)).size === 6 &&
    new Set(normalized.map((s) => s.teamName)).size === 6;
  if (!complete) return { ...empty, updatedAt: new Date(newest).toISOString() };
  const isFinal = latest.every((s) => s.isFinal === true);
  return {
    league, status: isFinal ? "final" : "provisional",
    updatedAt: new Date(newest).toISOString(),
    stale: !isFinal && now - newest > 36 * 60 * 60 * 1000,
    rows: normalized.map((s) => ({ ...s, teamName: s.teamName! })).sort((a, b) => a.rank - b.rank),
  };
}
/** Public, locked commentator picks only; the loader enforces the scope. */
export function summarizeResults(
  picks: PublicResultPick[], standings: ResultStanding[], scope: ResultScope, now: number = Date.now(),
): ResultSummary {
  const leagues = scope === "all" ? RESULT_LEAGUES : [scope];
  const snapshots = leagues.map((league) => latestResultSnapshot(standings, league, now));
  const status = snapshots.some((s) => s.status === "unavailable") ? "unavailable" :
    snapshots.every((s) => s.status === "final") ? "final" : "provisional";
  const grouped = new Map<number, PublicResultPick[]>();
  for (const pick of picks) {
    const group = grouped.get(pick.predictionId) ?? [];
    group.push(pick); grouped.set(pick.predictionId, group);
  }
  // Select a user's original/earliest entry BEFORE evaluating correctness.
  // This avoids choosing the variant that happens to score best after the fact.
  const selected = canonicalPredictions([...grouped.values()].map((group) => group[0]));
  const firstByUser = new Map(selected.map((row) => [row.userId, grouped.get(row.predictionId)!]));
  const entries: ResultEntry[] = [];
  let eligible = 0;
  for (const group of firstByUser.values()) {
    const details: ResultDetail[] = [];
    let complete = true;
    for (const league of leagues) {
      const selected = group.filter((p) => p.league === league);
      const names = selected.map((p) => canonical(p.teamName, league));
      if (selected.length !== 6 || names.some((n) => !n) || new Set(names).size !== 6 ||
        new Set(selected.map((p) => p.rank)).size !== 6 ||
        selected.some((p) => !Number.isInteger(p.rank) || p.rank < 1 || p.rank > 6)) {
        complete = false; break;
      }
      const actual = snapshots.find((s) => s.league === league)!;
      if (actual.status === "unavailable") continue;
      selected.forEach((pick, i) => {
        const standing = actual.rows.find((s) => s.teamName === names[i])!;
        details.push({ league, teamName: names[i]!, predictedRank: pick.rank,
          actualRank: standing.rank, difference: Math.abs(pick.rank - standing.rank) });
      });
    }
    if (!complete) continue;
    eligible++;
    if (status === "unavailable") continue;
    const author = group[0];
    entries.push({
      userId: author.userId, predictionId: author.predictionId, name: author.name, slug: author.slug,
      source: author.source, sourceUrl: safeSourceUrl(author.sourceUrl), variant: author.variant, rank: 0,
      exact: details.filter((d) => d.difference === 0).length,
      deviation: details.reduce((sum, d) => sum + d.difference, 0),
      details: details.sort((a, b) => a.league.localeCompare(b.league) || a.predictedRank - b.predictedRank),
    });
  }
  const ranked = rankResultEntries(entries, "points");
  return {
    scope, status, snapshots, entries: ranked, eligible, excluded: firstByUser.size - eligible,
    perfect: status === "unavailable" || !eligible ? null : entries.filter((e) => e.exact === leagues.length * 6).length,
    target: leagues.length * 6,
  };
}
