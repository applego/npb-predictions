/** Freeze already-public commentator predictions with year-verified official FINAL standings. */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { scrapeNpbStandings } from "../src/lib/scrape-npb";
import { getTeamsByLeague, getTeamByName } from "../src/lib/teams";
async function main() {
  const [yearArg, publicFile, seasonsFile] = process.argv.slice(2);
  const year = Number(yearArg);
  if (!Number.isInteger(year) || !publicFile || !seasonsFile) throw new Error("Usage: tsx scripts/build-public-results-archive.ts YEAR PUBLIC_EXPORT SEASONS_EXPORT");
  const raw = readFileSync(publicFile, "utf8"); const input = JSON.parse(raw);
  if (input.season?.year !== year || input.commentators?.length !== input.totalCommentators) throw new Error("Public export season/count mismatch");
  const ids = new Set<number>();
  const commentators = input.commentators.map((person: { userId: number; name: string; slug: string; variant: string | null; centralDetails: { rank: number; predictedTeam: string }[]; pacificDetails: { rank: number; predictedTeam: string }[] }) => {
    if (!Number.isInteger(person.userId) || person.userId < 1 || ids.has(person.userId) || typeof person.name !== "string" || typeof person.slug !== "string") throw new Error("Invalid public commentator identity");
    ids.add(person.userId);
    const rankings: { league: "central" | "pacific"; rank: number; teamName: string }[] = [];
    for (const league of ["central", "pacific"] as const) {
      const details = league === "central" ? person.centralDetails : person.pacificDetails;
      if (!details.length) continue;
      const rows = details.map((detail) => ({ league, rank: detail.rank, teamName: getTeamByName(detail.predictedTeam)?.name ?? "" }));
      if (rows.length !== 6 || new Set(rows.map((row) => row.rank)).size !== 6 || new Set(rows.map((row) => row.teamName)).size !== 6 || rows.some((row) => row.rank < 1 || row.rank > 6 || !Number.isInteger(row.rank) || !getTeamsByLeague(league).some((team) => team.name === row.teamName))) throw new Error("Incomplete public prediction");
      rankings.push(...rows);
    }
    return { userId: person.userId, name: person.name, slug: person.slug, variant: person.variant || null, rankings };
  });
  const standings = await scrapeNpbStandings(year);
  if (standings.length !== 12 || standings.some((row) => row.isFinal !== true)) throw new Error("Only official completed seasons may be archived");
  const observedAt = new Date().toISOString();
  const archive = {
    version: 1, year, observedAt,
    provenance: { predictionsUrl: `https://npb-predictions.pages.dev/api/rankings/commentators?year=${year}&league=central`, predictionsObservedAt: statSync(publicFile).mtime.toISOString(), predictionsSha256: createHash("sha256").update(raw).digest("hex"), standingsUrls: [`https://npb.jp/bis/${year}/stats/std_c.html`, `https://npb.jp/bis/${year}/stats/std_p.html`] },
    years: JSON.parse(readFileSync(seasonsFile, "utf8")).map((row: { year: number }) => row.year),
    standings: standings.map((row) => ({ league: row.league, rank: row.rank, teamName: row.teamName, isFinal: true, snapshotDate: observedAt })), commentators,
  };
  const path = resolve(`../data/public-results-${year}.json`);
  writeFileSync(path, JSON.stringify(archive) + "\n"); console.log(JSON.stringify({ path, year, commentators: commentators.length, standings: standings.length, observedAt }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
