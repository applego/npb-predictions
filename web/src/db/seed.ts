/**
 * Seed script for NPB Predictions League
 *
 * Inserts:
 *  - 2 seasons (2025 final, 2026 active)
 *  - 5 members (Oya, Ishiro, Kuramoto, Tsuneshige, Kumagae)
 *  - 10 predictions (5 users × 2 seasons) with ranking + title picks
 *  - 2025 actual standings (final) for score calculation demo
 *
 * Usage: npx tsx src/db/seed.ts
 */

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
  titlePicks,
  actualTeamStandings,
  actualTitleSnapshots,
} = schema;

// ── Constants ──

const CENTRAL_TEAMS = ["巨人", "阪神", "DeNA", "広島", "中日", "ヤクルト"];
const PACIFIC_TEAMS = [
  "オリックス",
  "ソフトバンク",
  "ロッテ",
  "楽天",
  "日本ハム",
  "西武",
];

const MEMBERS = [
  { name: "大矢", slug: "oya" },
  { name: "Ishiro", slug: "ishiro" },
  { name: "Kuramoto", slug: "kuramoto" },
  { name: "常重", slug: "tsuneshige" },
  { name: "熊谷", slug: "kumagae" },
] as const;

type League = "central" | "pacific";
type TitleCategory =
  | "batting_avg"
  | "rbi"
  | "home_runs"
  | "wins"
  | "era"
  | "saves";

interface TitlePick {
  league: League;
  category: TitleCategory;
  playerName: string;
  teamName: string;
}

// ── 2025 Predictions (each member's pre-season picks) ──

const PREDICTIONS_2025: Record<
  string,
  { central: string[]; pacific: string[]; titles: TitlePick[] }
> = {
  oya: {
    central: ["阪神", "巨人", "DeNA", "広島", "ヤクルト", "中日"],
    pacific: ["オリックス", "ソフトバンク", "ロッテ", "楽天", "日本ハム", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "牧 秀悟", teamName: "DeNA" },
      { league: "central", category: "rbi", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "home_runs", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "wins", playerName: "東 克樹", teamName: "DeNA" },
      { league: "central", category: "era", playerName: "青柳 晃洋", teamName: "阪神" },
      { league: "central", category: "saves", playerName: "岩崎 優", teamName: "阪神" },
      { league: "pacific", category: "batting_avg", playerName: "近藤 健介", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "home_runs", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "wins", playerName: "山本 由伸", teamName: "オリックス" },
      { league: "pacific", category: "era", playerName: "宮城 大弥", teamName: "オリックス" },
      { league: "pacific", category: "saves", playerName: "松井 裕樹", teamName: "楽天" },
    ],
  },
  ishiro: {
    central: ["巨人", "阪神", "広島", "DeNA", "中日", "ヤクルト"],
    pacific: ["ソフトバンク", "オリックス", "ロッテ", "日本ハム", "楽天", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "宮﨑 敏郎", teamName: "DeNA" },
      { league: "central", category: "rbi", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "home_runs", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "wins", playerName: "戸郷 翔征", teamName: "巨人" },
      { league: "central", category: "era", playerName: "東 克樹", teamName: "DeNA" },
      { league: "central", category: "saves", playerName: "栗林 良吏", teamName: "広島" },
      { league: "pacific", category: "batting_avg", playerName: "柳田 悠岐", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "home_runs", playerName: "浅村 栄斗", teamName: "楽天" },
      { league: "pacific", category: "wins", playerName: "宮城 大弥", teamName: "オリックス" },
      { league: "pacific", category: "era", playerName: "山本 由伸", teamName: "オリックス" },
      { league: "pacific", category: "saves", playerName: "オスナ", teamName: "ソフトバンク" },
    ],
  },
  kuramoto: {
    central: ["DeNA", "巨人", "阪神", "ヤクルト", "広島", "中日"],
    pacific: ["ソフトバンク", "ロッテ", "オリックス", "楽天", "日本ハム", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "牧 秀悟", teamName: "DeNA" },
      { league: "central", category: "rbi", playerName: "牧 秀悟", teamName: "DeNA" },
      { league: "central", category: "home_runs", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "wins", playerName: "今永 昇太", teamName: "DeNA" },
      { league: "central", category: "era", playerName: "戸郷 翔征", teamName: "巨人" },
      { league: "central", category: "saves", playerName: "岩崎 優", teamName: "阪神" },
      { league: "pacific", category: "batting_avg", playerName: "近藤 健介", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "浅村 栄斗", teamName: "楽天" },
      { league: "pacific", category: "home_runs", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "wins", playerName: "千賀 滉大", teamName: "ソフトバンク" },
      { league: "pacific", category: "era", playerName: "宮城 大弥", teamName: "オリックス" },
      { league: "pacific", category: "saves", playerName: "松井 裕樹", teamName: "楽天" },
    ],
  },
  tsuneshige: {
    central: ["阪神", "DeNA", "巨人", "広島", "中日", "ヤクルト"],
    pacific: ["オリックス", "ロッテ", "ソフトバンク", "日本ハム", "楽天", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "近本 光司", teamName: "阪神" },
      { league: "central", category: "rbi", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "home_runs", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "wins", playerName: "青柳 晃洋", teamName: "阪神" },
      { league: "central", category: "era", playerName: "東 克樹", teamName: "DeNA" },
      { league: "central", category: "saves", playerName: "マルティネス", teamName: "中日" },
      { league: "pacific", category: "batting_avg", playerName: "吉田 正尚", teamName: "オリックス" },
      { league: "pacific", category: "rbi", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "home_runs", playerName: "浅村 栄斗", teamName: "楽天" },
      { league: "pacific", category: "wins", playerName: "山本 由伸", teamName: "オリックス" },
      { league: "pacific", category: "era", playerName: "山本 由伸", teamName: "オリックス" },
      { league: "pacific", category: "saves", playerName: "益田 直也", teamName: "ロッテ" },
    ],
  },
  kumagae: {
    central: ["巨人", "DeNA", "阪神", "ヤクルト", "広島", "中日"],
    pacific: ["ソフトバンク", "オリックス", "楽天", "ロッテ", "日本ハム", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "rbi", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "home_runs", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "wins", playerName: "戸郷 翔征", teamName: "巨人" },
      { league: "central", category: "era", playerName: "青柳 晃洋", teamName: "阪神" },
      { league: "central", category: "saves", playerName: "岩崎 優", teamName: "阪神" },
      { league: "pacific", category: "batting_avg", playerName: "近藤 健介", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "home_runs", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "wins", playerName: "宮城 大弥", teamName: "オリックス" },
      { league: "pacific", category: "era", playerName: "千賀 滉大", teamName: "ソフトバンク" },
      { league: "pacific", category: "saves", playerName: "松井 裕樹", teamName: "楽天" },
    ],
  },
};

// ── 2026 Predictions ──

const PREDICTIONS_2026: Record<
  string,
  { central: string[]; pacific: string[]; titles: TitlePick[] }
> = {
  oya: {
    central: ["巨人", "阪神", "DeNA", "広島", "ヤクルト", "中日"],
    pacific: ["ソフトバンク", "オリックス", "ロッテ", "楽天", "日本ハム", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "牧 秀悟", teamName: "DeNA" },
      { league: "central", category: "rbi", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "home_runs", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "wins", playerName: "戸郷 翔征", teamName: "巨人" },
      { league: "central", category: "era", playerName: "東 克樹", teamName: "DeNA" },
      { league: "central", category: "saves", playerName: "岩崎 優", teamName: "阪神" },
      { league: "pacific", category: "batting_avg", playerName: "近藤 健介", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "home_runs", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "wins", playerName: "宮城 大弥", teamName: "オリックス" },
      { league: "pacific", category: "era", playerName: "宮城 大弥", teamName: "オリックス" },
      { league: "pacific", category: "saves", playerName: "松井 裕樹", teamName: "楽天" },
    ],
  },
  ishiro: {
    central: ["阪神", "巨人", "DeNA", "広島", "中日", "ヤクルト"],
    pacific: ["ソフトバンク", "オリックス", "ロッテ", "日本ハム", "楽天", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "近本 光司", teamName: "阪神" },
      { league: "central", category: "rbi", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "home_runs", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "wins", playerName: "才木 浩人", teamName: "阪神" },
      { league: "central", category: "era", playerName: "戸郷 翔征", teamName: "巨人" },
      { league: "central", category: "saves", playerName: "栗林 良吏", teamName: "広島" },
      { league: "pacific", category: "batting_avg", playerName: "柳田 悠岐", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "浅村 栄斗", teamName: "楽天" },
      { league: "pacific", category: "home_runs", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "wins", playerName: "山本 由伸", teamName: "オリックス" },
      { league: "pacific", category: "era", playerName: "山本 由伸", teamName: "オリックス" },
      { league: "pacific", category: "saves", playerName: "オスナ", teamName: "ソフトバンク" },
    ],
  },
  kuramoto: {
    central: ["DeNA", "阪神", "巨人", "広島", "ヤクルト", "中日"],
    pacific: ["オリックス", "ソフトバンク", "ロッテ", "楽天", "日本ハム", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "宮﨑 敏郎", teamName: "DeNA" },
      { league: "central", category: "rbi", playerName: "牧 秀悟", teamName: "DeNA" },
      { league: "central", category: "home_runs", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "wins", playerName: "東 克樹", teamName: "DeNA" },
      { league: "central", category: "era", playerName: "東 克樹", teamName: "DeNA" },
      { league: "central", category: "saves", playerName: "マルティネス", teamName: "中日" },
      { league: "pacific", category: "batting_avg", playerName: "近藤 健介", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "home_runs", playerName: "浅村 栄斗", teamName: "楽天" },
      { league: "pacific", category: "wins", playerName: "宮城 大弥", teamName: "オリックス" },
      { league: "pacific", category: "era", playerName: "宮城 大弥", teamName: "オリックス" },
      { league: "pacific", category: "saves", playerName: "松井 裕樹", teamName: "楽天" },
    ],
  },
  tsuneshige: {
    central: ["巨人", "DeNA", "阪神", "ヤクルト", "広島", "中日"],
    pacific: ["ソフトバンク", "ロッテ", "オリックス", "楽天", "日本ハム", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "牧 秀悟", teamName: "DeNA" },
      { league: "central", category: "rbi", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "home_runs", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "wins", playerName: "戸郷 翔征", teamName: "巨人" },
      { league: "central", category: "era", playerName: "才木 浩人", teamName: "阪神" },
      { league: "central", category: "saves", playerName: "岩崎 優", teamName: "阪神" },
      { league: "pacific", category: "batting_avg", playerName: "柳田 悠岐", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "home_runs", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "wins", playerName: "千賀 滉大", teamName: "ソフトバンク" },
      { league: "pacific", category: "era", playerName: "千賀 滉大", teamName: "ソフトバンク" },
      { league: "pacific", category: "saves", playerName: "益田 直也", teamName: "ロッテ" },
    ],
  },
  kumagae: {
    central: ["阪神", "DeNA", "巨人", "広島", "中日", "ヤクルト"],
    pacific: ["ソフトバンク", "オリックス", "楽天", "ロッテ", "日本ハム", "西武"],
    titles: [
      { league: "central", category: "batting_avg", playerName: "近本 光司", teamName: "阪神" },
      { league: "central", category: "rbi", playerName: "岡本 和真", teamName: "巨人" },
      { league: "central", category: "home_runs", playerName: "村上 宗隆", teamName: "ヤクルト" },
      { league: "central", category: "wins", playerName: "才木 浩人", teamName: "阪神" },
      { league: "central", category: "era", playerName: "東 克樹", teamName: "DeNA" },
      { league: "central", category: "saves", playerName: "栗林 良吏", teamName: "広島" },
      { league: "pacific", category: "batting_avg", playerName: "近藤 健介", teamName: "ソフトバンク" },
      { league: "pacific", category: "rbi", playerName: "浅村 栄斗", teamName: "楽天" },
      { league: "pacific", category: "home_runs", playerName: "山川 穂高", teamName: "ソフトバンク" },
      { league: "pacific", category: "wins", playerName: "山本 由伸", teamName: "オリックス" },
      { league: "pacific", category: "era", playerName: "山本 由伸", teamName: "オリックス" },
      { league: "pacific", category: "saves", playerName: "オスナ", teamName: "ソフトバンク" },
    ],
  },
};

// ── 2025 Actual Results (final standings) ──

const ACTUAL_2025_STANDINGS = {
  central: [
    { rank: 1, teamName: "阪神", wins: 78, losses: 59, draws: 6 },
    { rank: 2, teamName: "巨人", wins: 75, losses: 62, draws: 6 },
    { rank: 3, teamName: "DeNA", wins: 72, losses: 65, draws: 6 },
    { rank: 4, teamName: "広島", wins: 68, losses: 69, draws: 6 },
    { rank: 5, teamName: "ヤクルト", wins: 60, losses: 77, draws: 6 },
    { rank: 6, teamName: "中日", wins: 55, losses: 82, draws: 6 },
  ],
  pacific: [
    { rank: 1, teamName: "ソフトバンク", wins: 82, losses: 55, draws: 6 },
    { rank: 2, teamName: "オリックス", wins: 76, losses: 61, draws: 6 },
    { rank: 3, teamName: "ロッテ", wins: 71, losses: 66, draws: 6 },
    { rank: 4, teamName: "楽天", wins: 65, losses: 72, draws: 6 },
    { rank: 5, teamName: "日本ハム", wins: 62, losses: 75, draws: 6 },
    { rank: 6, teamName: "西武", wins: 52, losses: 85, draws: 6 },
  ],
};

const ACTUAL_2025_TITLES: TitlePick[] = [
  { league: "central", category: "batting_avg", playerName: "牧 秀悟", teamName: "DeNA" },
  { league: "central", category: "rbi", playerName: "岡本 和真", teamName: "巨人" },
  { league: "central", category: "home_runs", playerName: "村上 宗隆", teamName: "ヤクルト" },
  { league: "central", category: "wins", playerName: "戸郷 翔征", teamName: "巨人" },
  { league: "central", category: "era", playerName: "東 克樹", teamName: "DeNA" },
  { league: "central", category: "saves", playerName: "岩崎 優", teamName: "阪神" },
  { league: "pacific", category: "batting_avg", playerName: "近藤 健介", teamName: "ソフトバンク" },
  { league: "pacific", category: "rbi", playerName: "山川 穂高", teamName: "ソフトバンク" },
  { league: "pacific", category: "home_runs", playerName: "山川 穂高", teamName: "ソフトバンク" },
  { league: "pacific", category: "wins", playerName: "宮城 大弥", teamName: "オリックス" },
  { league: "pacific", category: "era", playerName: "宮城 大弥", teamName: "オリックス" },
  { league: "pacific", category: "saves", playerName: "松井 裕樹", teamName: "楽天" },
];

// ── Seed Runner ──

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set. Create .env.local with your Neon connection string.");
    process.exit(1);
  }

  // Auto-detect: Neon (contains neondb.net) vs local PostgreSQL
  const isNeon = databaseUrl.includes("neondb.net") || databaseUrl.includes("neon.tech");
  const pgClient = isNeon ? null : postgres(databaseUrl);
  const db = isNeon
    ? drizzleNeon({ client: neon(databaseUrl), schema })
    : drizzlePostgres({ client: pgClient!, schema });

  console.log("🌱 Starting NPB Predictions seed...\n");

  // 1. Insert seasons
  console.log("📅 Creating seasons...");
  const [season2025] = await db
    .insert(seasons)
    .values({ year: 2025, label: "2025シーズン", isActive: false })
    .onConflictDoNothing()
    .returning();
  const [season2026] = await db
    .insert(seasons)
    .values({ year: 2026, label: "2026シーズン", isActive: true })
    .onConflictDoNothing()
    .returning();

  // Fallback: if already existed, fetch them
  const allSeasons = await db.query.seasons.findMany();
  const s2025 = season2025 ?? allSeasons.find((s) => s.year === 2025)!;
  const s2026 = season2026 ?? allSeasons.find((s) => s.year === 2026)!;
  console.log(`  ✓ 2025 (id=${s2025.id}), 2026 (id=${s2026.id})\n`);

  // 2. Insert users
  console.log("👥 Registering 5 members...");
  await db
    .insert(users)
    .values(MEMBERS.map((m) => ({ name: m.name, slug: m.slug })))
    .onConflictDoNothing();

  const allUsers = await db.query.users.findMany();
  const userMap = new Map(allUsers.map((u) => [u.slug, u]));
  for (const m of MEMBERS) {
    const u = userMap.get(m.slug);
    console.log(`  ✓ ${m.name} (id=${u?.id})`);
  }
  console.log();

  // 3. Insert predictions for 2025
  console.log("🔮 Inserting 2025 predictions...");
  await insertPredictions(db, s2025.id, PREDICTIONS_2025, userMap);

  // 4. Insert predictions for 2026
  console.log("🔮 Inserting 2026 predictions...");
  await insertPredictions(db, s2026.id, PREDICTIONS_2026, userMap);

  // 5. Insert 2025 actual standings (final)
  console.log("📊 Inserting 2025 actual standings (final)...");
  const standingsDate = new Date("2025-10-15T00:00:00Z");
  for (const league of ["central", "pacific"] as const) {
    const teams = ACTUAL_2025_STANDINGS[league];
    await db
      .insert(actualTeamStandings)
      .values(
        teams.map((t) => ({
          seasonId: s2025.id,
          league,
          rank: t.rank,
          teamName: t.teamName,
          wins: t.wins,
          losses: t.losses,
          draws: t.draws,
          snapshotDate: standingsDate,
          isFinal: true,
        }))
      )
      .onConflictDoNothing();
  }
  console.log("  ✓ Central & Pacific final standings\n");

  // 6. Insert 2025 actual title winners
  console.log("🏆 Inserting 2025 actual title winners...");
  await db
    .insert(actualTitleSnapshots)
    .values(
      ACTUAL_2025_TITLES.map((t) => ({
        seasonId: s2025.id,
        league: t.league,
        category: t.category,
        playerName: t.playerName,
        teamName: t.teamName,
        snapshotDate: standingsDate,
        isFinal: true,
      }))
    )
    .onConflictDoNothing();
  console.log("  ✓ 12 title winners\n");

  console.log("✅ Seed complete!");
  console.log("   - 2 seasons (2025 final, 2026 active)");
  console.log("   - 5 members");
  console.log("   - 10 prediction sets (5 users × 2 seasons)");
  console.log("   - 2025 actual standings + title winners");

  // Close connection for local postgres-js client
  if (pgClient) {
    await pgClient.end();
  }
}

async function insertPredictions(
  db: any,
  seasonId: number,
  predictionData: typeof PREDICTIONS_2025,
  userMap: Map<string, { id: number; slug: string; name: string }>
) {
  for (const [slug, data] of Object.entries(predictionData)) {
    const user = userMap.get(slug);
    if (!user) {
      console.warn(`  ⚠ User ${slug} not found, skipping`);
      continue;
    }

    // Check if prediction already exists
    const existing = await db.query.predictions.findFirst({
      where: (p: any, { and, eq }: any) =>
        and(eq(p.userId, user.id), eq(p.seasonId, seasonId)),
    });
    if (existing) {
      console.log(`  → ${user.name}: already exists (id=${existing.id}), skipping`);
      continue;
    }

    const [prediction] = await db
      .insert(predictions)
      .values({ userId: user.id, seasonId })
      .returning();

    // Ranking picks: central 1-6, pacific 1-6
    const rankingRows = [
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
    await db.insert(rankingPicks).values(rankingRows);

    // Title picks
    await db.insert(titlePicks).values(
      data.titles.map((t) => ({
        predictionId: prediction.id,
        league: t.league,
        category: t.category,
        playerName: t.playerName,
        teamName: t.teamName,
      }))
    );

    console.log(
      `  ✓ ${user.name}: 12 ranking picks + ${data.titles.length} title picks`
    );
  }
  console.log();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
