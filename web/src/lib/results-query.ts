import type { ResultScope } from "./season-results";
export type ResultsQuery = { year?: string | string[]; league?: string | string[] };
export function parseResultsQuery(query: ResultsQuery): { year: number | undefined; scope: ResultScope; valid: boolean } {
  const rawYear = Array.isArray(query.year) ? query.year[0] : query.year;
  const rawLeague = Array.isArray(query.league) ? query.league[0] : query.league;
  const year = rawYear === undefined ? undefined : Number(rawYear);
  const scope = rawLeague ?? "central";
  const valid = (rawYear === undefined || (/^\d{4}$/.test(rawYear) && Number.isInteger(year) && year! >= 1936 && year! <= 2100)) && ["central", "pacific", "all"].includes(scope);
  return { year, scope: valid ? scope as ResultScope : "central", valid };
}
