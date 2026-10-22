/** Freeze a full public export; never infer completeness from an ordinary league ranking. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { scrapeNpbStandings } from "../src/lib/scrape-npb";
import { freezePublicResults, verifyPublicResultsExport } from "../src/lib/public-results-freeze";

async function main() {
  const [yearArg, publicFile, seasonsFile, outputFile] = process.argv.slice(2);
  const year = Number(yearArg);
  if (!/^\d{4}$/.test(yearArg ?? "") || !publicFile || !seasonsFile || !outputFile || process.argv.length !== 6) {
    throw new Error("Usage: tsx scripts/build-public-results-archive.ts YEAR PUBLIC_EXPORT SEASONS_EXPORT NEW_OUTPUT");
  }
  const raw = readFileSync(publicFile, "utf8");
  // Reject old/partial/tampered exports before any external request or file write.
  verifyPublicResultsExport(raw, year);
  const seasons: unknown = JSON.parse(readFileSync(seasonsFile, "utf8"));
  if (!Array.isArray(seasons) || seasons.some((row) => !row || !Number.isInteger(row.year))) throw new Error("Invalid seasons export");
  const standings = await scrapeNpbStandings(year);
  const observedAt = new Date().toISOString();
  const archive = freezePublicResults(raw, year, seasons.map((row) => row.year),
    standings.map((row) => ({ ...row, isFinal: row.isFinal === true, snapshotDate: observedAt })), observedAt);
  const path = resolve(outputFile);
  // Publication is a separate review step; never overwrite the currently shipped archive.
  writeFileSync(path, JSON.stringify(archive) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ path, year, population: archive.population, predictionsPayloadHash: archive.provenance.predictionsPayloadHash }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
