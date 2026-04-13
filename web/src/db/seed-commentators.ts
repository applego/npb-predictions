/**
 * Seed script for commentator prediction data
 *
 * Imports ~700 commentator predictions from commentator_predictions.json,
 * creates seasons 2023/2024 if missing, inserts actual standings for 2023-2025,
 * calculates and inserts score_snapshots, and adds 2023 friend predictions.
 *
 * Usage: npx tsx src/db/seed-commentators.ts
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const {
  users,
  seasons,
  predictions,
  rankingPicks,
  actualTeamStandings,
  scoreSnapshots,
} = schema;

// ── Types ──

interface CommentatorEntry {
  name: string;
  variant: string | null;
  rankings: string[];
  source: string;
  date: string;
}

interface CommentatorData {
  [year: string]: {
    central?: CommentatorEntry[];
    pacific?: CommentatorEntry[];
  };
}

type League = "central" | "pacific";

// ── Actual Standings ──

const ACTUAL_STANDINGS: Record<number, Record<League, string[]>> = {
  2023: {
    central: ["阪神", "広島", "DeNA", "巨人", "ヤクルト", "中日"],
    pacific: ["オリックス", "ロッテ", "ソフトバンク", "楽天", "西武", "日本ハム"],
  },
  2024: {
    central: ["巨人", "阪神", "DeNA", "広島", "ヤクルト", "中日"],
    pacific: ["ソフトバンク", "日本ハム", "ロッテ", "楽天", "オリックス", "西武"],
  },
  2025: {
    central: ["阪神", "DeNA", "巨人", "中日", "広島", "ヤクルト"],
    pacific: ["ソフトバンク", "日本ハム", "オリックス", "楽天", "西武", "ロッテ"],
  },
};

// ── Friends' 2023 Predictions ──

const FRIEND_2023_PREDICTIONS: Record<string, { central: string[]; pacific: string[] }> = {
  oya: {
    central: ["阪神", "広島", "巨人", "中日", "DeNA", "ヤクルト"],
    pacific: ["西武", "日本ハム", "ソフトバンク", "オリックス", "ロッテ", "楽天"],
  },
  ishiro: {
    central: ["DeNA", "阪神", "ヤクルト", "広島", "巨人", "中日"],
    pacific: ["ソフトバンク", "オリックス", "楽天", "西武", "ロッテ", "日本ハム"],
  },
  kuramoto: {
    central: ["阪神", "ヤクルト", "巨人", "DeNA", "中日", "広島"],
    pacific: ["ソフトバンク", "オリックス", "楽天", "ロッテ", "西武", "日本ハム"],
  },
  tsuneshige: {
    central: ["DeNA", "阪神", "中日", "ヤクルト", "巨人", "広島"],
    pacific: ["オリックス", "ソフトバンク", "西武", "楽天", "ロッテ", "日本ハム"],
  },
  kumagae: {
    central: ["DeNA", "ヤクルト", "中日", "阪神", "広島", "巨人"],
    pacific: ["オリックス", "楽天", "ソフトバンク", "西武", "日本ハム", "ロッテ"],
  },
};

// ── Scoring ──

const RANKING_SCORE_TABLE: Record<number, number> = {
  0: 5, 1: 3, 2: 1, 3: -1, 4: -3, 5: -5,
};

function calcRankingScore(
  picks: { league: League; rank: number; teamName: string }[],
  standings: Record<League, string[]>
): number {
  let score = 0;
  for (const pick of picks) {
    const actualTeams = standings[pick.league];
    const actualRank = actualTeams.indexOf(pick.teamName) + 1;
    if (actualRank === 0) continue; // team not found
    const diff = Math.min(Math.abs(pick.rank - actualRank), 5);
    score += RANKING_SCORE_TABLE[diff] ?? -5;
  }
  return score;
}

// ── Main Seed ──

async function seedCommentators() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Create .env.local with your connection string.");
    process.exit(1);
  }

  // Auto-detect: Neon vs local PostgreSQL (same pattern as seed.ts)
  const isNeon = databaseUrl.includes("neondb.net") || databaseUrl.includes("neon.tech");
  const pgClient = isNeon ? null : postgres(databaseUrl);
  const db = isNeon
    ? drizzleNeon({ client: neon(databaseUrl), schema })
    : drizzlePostgres({ client: pgClient!, schema });

  console.log("Starting commentator seed...\n");

  // 1. Load commentator data
  // Resolve relative to this file's location: src/db/ -> ../../data/ (at project root's sibling)
  const thisDir = typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));
  const jsonPath = resolve(thisDir, "../../../../data/commentator_predictions.json");
  const rawData: CommentatorData = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Loaded commentator data from ${jsonPath}`);

  // 2. Ensure seasons 2023-2026 exist
  console.log("\n--- Seasons ---");
  const seasonYears = [2023, 2024, 2025, 2026];
  for (const year of seasonYears) {
    await db
      .insert(seasons)
      .values({ year, label: `${year}シーズン`, isActive: year === 2026 })
      .onConflictDoNothing();
  }
  const allSeasons = await db.query.seasons.findMany();
  const seasonMap = new Map(allSeasons.map((s) => [s.year, s]));
  for (const year of seasonYears) {
    const s = seasonMap.get(year);
    console.log(`  ${year}: id=${s?.id ?? "MISSING"}`);
  }

  // 3. Insert actual standings for 2023 and 2024 (2025 already exists from seed.ts)
  console.log("\n--- Actual Standings ---");
  for (const year of [2023, 2024]) {
    const season = seasonMap.get(year);
    if (!season) {
      console.warn(`  Season ${year} not found, skipping standings`);
      continue;
    }
    const standings = ACTUAL_STANDINGS[year];
    const standingsDate = new Date(`${year}-10-15T00:00:00Z`);

    for (const league of ["central", "pacific"] as const) {
      const teams = standings[league];
      await db
        .insert(actualTeamStandings)
        .values(
          teams.map((teamName, i) => ({
            seasonId: season.id,
            league,
            rank: i + 1,
            teamName,
            wins: 0,
            losses: 0,
            draws: 0,
            snapshotDate: standingsDate,
            isFinal: true,
          }))
        )
        .onConflictDoNothing();
    }
    console.log(`  ${year}: Central & Pacific final standings inserted`);
  }

  // 4. Create commentator users and their predictions
  console.log("\n--- Commentator Users & Predictions ---");

  // Build a deduplication map: across all years, collect unique (name, variant, source) combos
  // Each combo gets ONE user. Within the same year, one user can have only ONE prediction.
  // If the same (name, variant) appears multiple times in the same year/league,
  // we take the first occurrence and skip duplicates.

  // Step 4a: Collect all unique commentator identities
  // Identity key = "name|variant|source" — this ensures same person at different media = different user
  // But actually the spec says: one user per unique commentator, multiple predictions for variants
  // The variant field in the JSON already distinguishes multiple media appearances.
  // For entries WITHOUT variant that are duplicated (same name, same year, different source),
  // we auto-assign variant labels.

  interface ParsedEntry {
    name: string;
    variant: string;
    source: string;
    date: string;
    year: number;
    league: League;
    rankings: string[];
  }

  const allEntries: ParsedEntry[] = [];

  for (const [yearStr, yearData] of Object.entries(rawData)) {
    const year = parseInt(yearStr);
    for (const league of ["central", "pacific"] as const) {
      const entries = yearData[league] ?? [];
      for (const entry of entries) {
        allEntries.push({
          name: entry.name,
          variant: entry.variant ?? "",
          source: entry.source,
          date: entry.date,
          year,
          league,
          rankings: entry.rankings,
        });
      }
    }
  }

  // Step 4b: Deduplicate within same year+league: for (name, variant) duplicates,
  // only keep the first occurrence per league. But across leagues they can coexist.
  // Actually for predictions, we want one prediction per user per season.
  // Within a season, a user's central and pacific rankings come from their entries.
  // If a user appears in central but not pacific (or vice versa), we still create a prediction
  // with only the available league rankings.
  //
  // For duplicates in the same league+year with the same (name, variant):
  // take the first one, skip the rest.

  // Group by year -> (name, variant) -> league -> first entry
  const yearGroups = new Map<number, Map<string, Map<League, ParsedEntry>>>();

  for (const entry of allEntries) {
    const key = `${entry.name}|${entry.variant}`;
    if (!yearGroups.has(entry.year)) yearGroups.set(entry.year, new Map());
    const nameMap = yearGroups.get(entry.year)!;
    if (!nameMap.has(key)) nameMap.set(key, new Map());
    const leagueMap = nameMap.get(key)!;
    // Take first occurrence only (skip duplicates)
    if (!leagueMap.has(entry.league)) {
      leagueMap.set(entry.league, entry);
    }
  }

  // Step 4c: Collect all unique user identities across all years
  // Identity = (name, variant) — same commentator same variant = same user
  const userIdentities = new Map<string, { name: string; variant: string; source: string }>();

  for (const [, nameMap] of Array.from(yearGroups)) {
    for (const [key, leagueMap] of Array.from(nameMap)) {
      if (!userIdentities.has(key)) {
        // Take source from the first league entry we find
        const firstEntry = leagueMap.values().next().value!;
        userIdentities.set(key, {
          name: firstEntry.name,
          variant: firstEntry.variant,
          source: firstEntry.source,
        });
      }
    }
  }

  console.log(`  Found ${userIdentities.size} unique commentator identities`);

  // Step 4d: Create users — check if they exist first (idempotent)
  const existingUsers = await db.query.users.findMany();
  const existingSlugSet = new Set(existingUsers.map((u) => u.slug));
  const userSlugMap = new Map(existingUsers.map((u) => [u.slug, u]));

  let slugIndex = 0;
  const identityToSlug = new Map<string, string>();

  for (const [key, identity] of Array.from(userIdentities)) {
    // Generate a unique slug
    let slug: string;
    const baseName = identity.name.replace(/\s+/g, "-");
    if (identity.variant) {
      slug = `${baseName}-${identity.variant}`;
    } else {
      slug = baseName;
    }

    // Ensure uniqueness
    let finalSlug = slug;
    let suffix = 2;
    while (existingSlugSet.has(finalSlug) && !identityToSlug.has(key)) {
      // Check if the existing user is the same commentator we want
      const existingUser = userSlugMap.get(finalSlug);
      if (existingUser && existingUser.name === identity.name) {
        // This is our user, reuse it
        break;
      }
      finalSlug = `${slug}-${suffix}`;
      suffix++;
    }

    identityToSlug.set(key, finalSlug);

    if (!existingSlugSet.has(finalSlug)) {
      slugIndex++;
      existingSlugSet.add(finalSlug);
    }
  }

  // Batch insert new users
  const newUsers: { name: string; slug: string; role: "commentator"; source: string | null; variant: string | null }[] = [];
  for (const [key, identity] of Array.from(userIdentities)) {
    const slug = identityToSlug.get(key)!;
    if (!userSlugMap.has(slug)) {
      newUsers.push({
        name: identity.name,
        slug,
        role: "commentator" as const,
        source: identity.source || null,
        variant: identity.variant || null,
      });
    }
  }

  if (newUsers.length > 0) {
    // Insert in batches to avoid hitting SQL parameter limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < newUsers.length; i += BATCH_SIZE) {
      const batch = newUsers.slice(i, i + BATCH_SIZE);
      await db.insert(users).values(batch).onConflictDoNothing();
    }
    console.log(`  Inserted ${newUsers.length} new commentator users`);
  } else {
    console.log(`  All commentator users already exist`);
  }

  // Refresh user map
  const allUsers = await db.query.users.findMany();
  const slugToUser = new Map(allUsers.map((u) => [u.slug, u]));

  // Step 4e: Create predictions and ranking_picks
  console.log("\n--- Predictions ---");
  let predCount = 0;
  let skipCount = 0;

  for (const [year, nameMap] of Array.from(yearGroups)) {
    const season = seasonMap.get(year);
    if (!season) {
      console.warn(`  Season ${year} not found, skipping predictions`);
      continue;
    }

    for (const [key, leagueMap] of Array.from(nameMap)) {
      const slug = identityToSlug.get(key);
      if (!slug) continue;
      const user = slugToUser.get(slug);
      if (!user) continue;

      // Check if prediction already exists
      const existing = await db.query.predictions.findFirst({
        where: (p: any, { and, eq }: any) =>
          and(eq(p.userId, user.id), eq(p.seasonId, season.id)),
      });
      if (existing) {
        skipCount++;
        continue;
      }

      // Create prediction
      const [prediction] = await db
        .insert(predictions)
        .values({ userId: user.id, seasonId: season.id, isLocked: true })
        .returning();

      // Create ranking picks for available leagues
      const rankRows: { predictionId: number; league: League; rank: number; teamName: string }[] = [];
      for (const [league, entry] of Array.from(leagueMap)) {
        for (let i = 0; i < entry.rankings.length; i++) {
          rankRows.push({
            predictionId: prediction.id,
            league,
            rank: i + 1,
            teamName: entry.rankings[i],
          });
        }
      }

      if (rankRows.length > 0) {
        await db.insert(rankingPicks).values(rankRows).onConflictDoNothing();
      }

      predCount++;
    }

    console.log(`  ${year}: processed`);
  }
  console.log(`  Total: ${predCount} predictions created, ${skipCount} skipped (already exist)`);

  // 5. Insert 2023 friend predictions
  console.log("\n--- 2023 Friend Predictions ---");
  const s2023 = seasonMap.get(2023);
  if (s2023) {
    for (const [slug, data] of Object.entries(FRIEND_2023_PREDICTIONS)) {
      const user = slugToUser.get(slug);
      if (!user) {
        console.warn(`  Friend ${slug} not found, skipping`);
        continue;
      }

      // Check if prediction already exists
      const existing = await db.query.predictions.findFirst({
        where: (p: any, { and, eq }: any) =>
          and(eq(p.userId, user.id), eq(p.seasonId, s2023.id)),
      });
      if (existing) {
        console.log(`  ${slug}: 2023 prediction already exists, skipping`);
        continue;
      }

      const [prediction] = await db
        .insert(predictions)
        .values({ userId: user.id, seasonId: s2023.id, isLocked: true })
        .returning();

      const rankRows = [
        ...data.central.map((team, i) => ({
          predictionId: prediction.id,
          league: "central" as const,
          rank: i + 1,
          teamName: team,
        })),
        ...data.pacific.map((team, i) => ({
          predictionId: prediction.id,
          league: "pacific" as const,
          rank: i + 1,
          teamName: team,
        })),
      ];
      await db.insert(rankingPicks).values(rankRows);
      console.log(`  ${slug}: 2023 prediction created`);
    }
  }

  // 6. Calculate and insert score_snapshots for 2023-2025
  console.log("\n--- Score Snapshots ---");
  for (const year of [2023, 2024, 2025]) {
    const season = seasonMap.get(year);
    if (!season) continue;
    const standings = ACTUAL_STANDINGS[year];
    if (!standings) continue;

    // Get all predictions for this season
    const allPredictions = await db.query.predictions.findMany({
      where: (p: any, { eq }: any) => eq(p.seasonId, season.id),
      with: { rankingPicks: true },
    });

    const snapshotDate = new Date(`${year}-10-15T00:00:00Z`);
    let insertCount = 0;

    for (const pred of allPredictions) {
      // Check if snapshot already exists
      const existingSnapshot = await db.query.scoreSnapshots.findFirst({
        where: (s: any, { and, eq }: any) =>
          and(
            eq(s.userId, pred.userId),
            eq(s.seasonId, season.id),
            eq(s.snapshotDate, snapshotDate)
          ),
      });
      if (existingSnapshot) continue;

      const picks = pred.rankingPicks.map((rp: any) => ({
        league: rp.league as League,
        rank: rp.rank,
        teamName: rp.teamName,
      }));

      const rankingScore = calcRankingScore(picks, standings);
      const titleScore = 0; // commentators have no title predictions
      const totalScore = rankingScore + titleScore;

      await db.insert(scoreSnapshots).values({
        userId: pred.userId,
        seasonId: season.id,
        rankingScore,
        titleScore,
        totalScore,
        snapshotDate,
      }).onConflictDoNothing();

      insertCount++;
    }

    console.log(`  ${year}: ${insertCount} score snapshots created (${allPredictions.length} total predictions)`);
  }

  console.log("\nSeed complete!");

  // Close connection for local postgres-js client
  if (pgClient) {
    await pgClient.end();
  }
}

seedCommentators().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
