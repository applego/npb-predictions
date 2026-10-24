import catalogData from "../../../data/commentator_predictions.json";
import { getTeamByName } from "./teams";
import type { PublicResultPick, ResultLeague, ResultScope } from "./season-results";

type SourceRecord = { name: string; variant: string | null; rankings: string[]; source: string | null; date: string | null };
type Catalog = Record<string, Partial<Record<ResultLeague, SourceRecord[]>>>;
const normalize = (name: string) => getTeamByName(name)?.name ?? name;

/** Profile provenance spans years; only attribute a source matching this exact prediction. */
export function withPredictionSources(picks: PublicResultPick[], year: number, scope: ResultScope, catalog: Catalog = catalogData): PublicResultPick[] {
  const groups = new Map<number, PublicResultPick[]>();
  for (const pick of picks) groups.set(pick.predictionId, [...(groups.get(pick.predictionId) ?? []), pick]);
  const sources = new Map<number, string | null>();
  const leagues: ResultLeague[] = scope === "all" ? ["central", "pacific"] : [scope];
  // Index candidates once instead of scanning the full annual catalog for every entry.
  // Keep every candidate in publication order: multiple exact citations are meaningful.
  const indexed = new Map<ResultLeague, Map<string, SourceRecord[]>>();
  for (const league of leagues) {
    const records = new Map<string, SourceRecord[]>();
    for (const record of catalog[String(year)]?.[league] ?? []) {
      const key = JSON.stringify([record.name, record.variant ?? ""]);
      const candidates = records.get(key) ?? [];
      candidates.push(record);
      records.set(key, candidates);
    }
    indexed.set(league, records);
  }
  for (const [id, group] of groups) {
    const labels = leagues.map((league) => {
      const rows = group.filter((row) => row.league === league).sort((a, b) => a.rank - b.rank);
      const key = JSON.stringify([group[0].name, group[0].variant ?? ""]);
      const matches = (indexed.get(league)?.get(key) ?? []).filter((record) =>
        rows.length === 6 && record.rankings.length === 6 && record.name === group[0].name &&
        (record.variant ?? "") === (group[0].variant ?? "") && record.source &&
        !Array.from(record.source.matchAll(/\b(20\d{2})年/g)).some((match) => Number(match[1]) !== year) &&
        record.rankings.every((name, index) => normalize(name) === normalize(rows[index].teamName)),
      );
      const names = [...new Set(matches.map((record) => `${record.source}${record.date ? `（${record.date}）` : ""}`))];
      const label = names.join("・");
      return scope === "all" ? `${league === "central" ? "セ" : "パ"}：${label || "当年出典未確認"}` : label;
    });
    sources.set(id, labels.filter(Boolean).join(" ／ ") || null);
  }
  // A person's generic URL cannot establish a year/league-specific original source.
  return picks.map((pick) => ({ ...pick, source: sources.get(pick.predictionId) ?? null, sourceUrl: null }));
}
