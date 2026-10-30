import { calcRankingPointForTeam } from "./scoring";
import type { ResultEntry, ResultLeague, ResultSnapshot } from "./season-results";
import { getTeamsByLeague } from "./teams";

/** One row of the newspaper-style sheet: a predictor and six picks from 1st to 6th. */
export interface SheetRow {
  key: string;
  name: string;
  /** Outlet, shown only to tell apart people with the same name. */
  source?: string | null;
  isMine: boolean;
  /** Full team names, index 0 = predicted 1st. */
  order: string[];
  /** Present only when actual standings exist. */
  result: { actualRanks: number[]; exact: number; deviation: number; points: number } | null;
}

export type SheetSort = "points" | "exact" | "deviation";
export const SHEET_MAX_COMMENTATORS = 8;
export const SHEET_DEFAULT_COMMENTATORS = 5;
export const SHEET_NAME_MAX = 20;

export interface SheetQuery {
  league: ResultLeague;
  sort: SheetSort;
  /** Selected commentator userIds, in the order given; null = use the default selection. */
  picks: number[] | null;
  me: { name: string; order: string[] } | null;
  /** Display name carried across league/year switches even before picks are complete. */
  name?: string;
}

type RawQuery = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The own row travels in the URL as team abbreviations so a shared link reproduces the sheet. */
export function parseSheetQuery(query: RawQuery): SheetQuery {
  const league: ResultLeague = first(query.league) === "pacific" ? "pacific" : "central";
  const rawSort = first(query.sort);
  const sort: SheetSort = rawSort === "exact" || rawSort === "deviation" ? rawSort : "points";
  const rawPicks = first(query.picks);
  const picks = rawPicks
    ? [...new Set(rawPicks.split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, SHEET_MAX_COMMENTATORS)
    : null;
  const name = (first(query.me) ?? "").trim().slice(0, SHEET_NAME_MAX);
  const order = decodeOrder(first(query.order) ?? "", league);
  return { league, sort, picks, me: name && order ? { name, order } : null, ...(name && !order ? { name } : {}) };
}

/** "神,巨,De,広,中,ヤ" → full names; null unless it is exactly the six teams of the league. */
export function decodeOrder(raw: string, league: ResultLeague): string[] | null {
  const teams = getTeamsByLeague(league);
  const names = raw.split(",").map((abbr) => teams.find((t) => t.abbr === abbr)?.name);
  if (names.length !== 6 || names.some((n) => !n) || new Set(names).size !== 6) return null;
  return names as string[];
}

export function encodeOrder(order: string[], league: ResultLeague): string {
  const teams = getTeamsByLeague(league);
  return order.map((name) => teams.find((t) => t.name === name)?.abbr ?? "").join(",");
}

export function sheetUrl(origin: string, year: number, query: SheetQuery): string {
  const params = new URLSearchParams({ year: String(year), league: query.league, sort: query.sort });
  if (query.picks) params.set("picks", query.picks.join(","));
  if (query.me) {
    params.set("me", query.me.name);
    params.set("order", encodeOrder(query.me.order, query.league));
  }
  return `${origin}/sheet?${params.toString()}`;
}

export function scoreOrder(order: string[], snapshot: ResultSnapshot | undefined): SheetRow["result"] {
  if (!snapshot || snapshot.status === "unavailable" || snapshot.rows.length !== 6) return null;
  const actualRanks = order.map((name) => snapshot.rows.find((row) => row.teamName === name)?.rank ?? 0);
  if (actualRanks.some((rank) => rank === 0)) return null;
  const diffs = actualRanks.map((actual, i) => Math.abs(actual - (i + 1)));
  return {
    actualRanks,
    exact: diffs.filter((d) => d === 0).length,
    deviation: diffs.reduce((sum, d) => sum + d, 0),
    points: actualRanks.reduce((sum, actual, i) => sum + calcRankingPointForTeam(i + 1, actual), 0),
  };
}

export function commentatorRow(entry: ResultEntry, league: ResultLeague, snapshot: ResultSnapshot | undefined): SheetRow {
  const order = entry.details
    .filter((d) => d.league === league)
    .sort((a, b) => a.predictedRank - b.predictedRank)
    .map((d) => d.teamName);
  return { key: `c${entry.userId}`, name: entry.name, isMine: false, order, result: scoreOrder(order, snapshot) };
}

/** Best first; ties keep the given order so the sheet does not reshuffle between renders. */
export function sortRows(rows: SheetRow[], sort: SheetSort): SheetRow[] {
  const value = (row: SheetRow) => {
    if (!row.result) return 0;
    return sort === "deviation" ? -row.result.deviation : sort === "exact" ? row.result.exact : row.result.points;
  };
  return rows.map((row, i) => ({ row, i })).sort((a, b) => value(b.row) - value(a.row) || a.i - b.i).map(({ row }) => row);
}
