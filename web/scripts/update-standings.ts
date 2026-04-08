#!/usr/bin/env npx tsx
/**
 * NPB Standings Update Script
 *
 * Updates actual standings via the admin API.
 * Run daily after checking NPB official standings.
 *
 * Usage:
 *   npx tsx scripts/update-standings.ts --season-id 1 --date 2026-04-01
 *   npx tsx scripts/update-standings.ts --help
 *
 * The script reads standings from STDIN as JSON or uses defaults.
 * Default standings order follows current NPB rankings — update manually.
 *
 * Example STDIN format:
 *   {
 *     "central": ["巨人","阪神","DeNA","広島","中日","ヤクルト"],
 *     "pacific": ["ソフトバンク","オリックス","ロッテ","楽天","日本ハム","西武"]
 *   }
 */

import * as fs from "node:fs";
import * as readline from "node:readline";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000";

interface StandingInput {
  seasonId: number;
  league: "central" | "pacific";
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
  isFinal?: boolean;
}

interface RankingsInput {
  central: string[];
  pacific: string[];
}

function parseArgs(): { seasonId: number; isFinal: boolean; help: boolean } {
  const args = process.argv.slice(2);
  let seasonId = 1;
  let isFinal = false;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--season-id" && args[i + 1]) {
      seasonId = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--final") {
      isFinal = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      help = true;
    }
  }

  return { seasonId, isFinal, help };
}

function buildStandings(
  rankings: RankingsInput,
  seasonId: number,
  isFinal: boolean
): StandingInput[] {
  const standings: StandingInput[] = [];

  for (const [league, teams] of Object.entries(rankings) as [
    "central" | "pacific",
    string[],
  ][]) {
    for (let i = 0; i < teams.length; i++) {
      standings.push({
        seasonId,
        league,
        rank: i + 1,
        teamName: teams[i],
        wins: 0,
        losses: 0,
        draws: 0,
        isFinal,
      });
    }
  }

  return standings;
}

async function readStdin(): Promise<RankingsInput | null> {
  if (process.stdin.isTTY) return null;

  return new Promise((resolve) => {
    let data = "";
    const rl = readline.createInterface({ input: process.stdin });
    rl.on("line", (line) => (data += line));
    rl.on("close", () => {
      try {
        resolve(JSON.parse(data) as RankingsInput);
      } catch {
        resolve(null);
      }
    });
  });
}

async function postStandings(standings: StandingInput[]): Promise<void> {
  const url = `${API_BASE}/api/admin/actual-standings/snapshot`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ standings }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const result = (await res.json()) as { inserted: number };
  console.log(`✅ Inserted ${result.inserted} standings records`);
}

async function triggerRecalculate(seasonId: number): Promise<void> {
  const url = `${API_BASE}/api/admin/recalculate-scores`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seasonId }),
  });

  if (!res.ok) {
    console.warn(`⚠️  Score recalculation failed: ${res.status}`);
    return;
  }

  const result = (await res.json()) as { updated: number };
  console.log(`✅ Recalculated scores for ${result.updated} users`);
}

async function main() {
  const { seasonId, isFinal, help } = parseArgs();

  if (help) {
    console.log(`
NPB Standings Update Script

Usage:
  npx tsx scripts/update-standings.ts [options] < standings.json

Options:
  --season-id <id>   Season ID (default: 1)
  --final            Mark as final standings
  --help             Show this help

STDIN (JSON):
  {
    "central": ["巨人","阪神","DeNA","広島","中日","ヤクルト"],
    "pacific": ["ソフトバンク","オリックス","ロッテ","楽天","日本ハム","西武"]
  }

Example:
  echo '{"central":["巨人","阪神","DeNA","広島","中日","ヤクルト"],"pacific":["ソフトバンク","オリックス","ロッテ","楽天","日本ハム","西武"]}' | \\
    npx tsx scripts/update-standings.ts --season-id 1
`);
    process.exit(0);
  }

  const stdinData = await readStdin();

  // Default standings (update based on actual NPB current rankings)
  const rankings: RankingsInput = stdinData ?? {
    central: ["巨人", "阪神", "DeNA", "広島", "中日", "ヤクルト"],
    pacific: ["ソフトバンク", "オリックス", "ロッテ", "楽天", "日本ハム", "西武"],
  };

  if (!stdinData) {
    console.warn("⚠️  Using default standings — provide actual rankings via STDIN");
  }

  const standings = buildStandings(rankings, seasonId, isFinal);

  console.log(`📊 Updating standings for season ${seasonId} (${isFinal ? "final" : "current"})`);
  console.log(`   Central: ${rankings.central.join(", ")}`);
  console.log(`   Pacific: ${rankings.pacific.join(", ")}`);

  await postStandings(standings);
  await triggerRecalculate(seasonId);

  console.log("✅ Done");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
