import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export type League = "central" | "pacific";
export type TitleCategory = "batting_avg" | "rbi" | "home_runs" | "wins" | "era" | "saves";
export type AwardType = "first_half_champion" | "monthly_champion" | "interleague_champion" | "solo_title" | "dark_horse";

export type UserRole = "friend" | "commentator" | "system";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  avatarUrl: text("avatar_url"),
  role: text("role").$type<UserRole>().default("friend").notNull(),
  source: text("source"),
  sourceUrl: text("source_url"),
  variant: text("variant"),
  firebaseUid: text("firebase_uid"),
  email: text("email"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  // Partial unique index: enforces one user per Firebase UID but leaves
  // legacy rows without a linked Firebase identity untouched.
  // Created by migration 0005_security_hardening.sql.
  uniqueIndex("users_firebase_uid_unique_idx")
    .on(table.firebaseUid)
    .where(sql`${table.firebaseUid} IS NOT NULL`),
]);

export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull().unique(),
  label: text("label").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
  lockDate: integer("lock_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const predictions = sqliteTable("predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  variant: text("variant"),  // ①②③ etc. — commentators can have multiple per year, friends get null (one only)
  isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
  lockedAt: integer("locked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [uniqueIndex("predictions_user_season_variant_idx").on(table.userId, table.seasonId, table.variant)]);

export const rankingPicks = sqliteTable("ranking_picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  predictionId: integer("prediction_id").notNull().references(() => predictions.id, { onDelete: "cascade" }),
  league: text("league").$type<League>().notNull(),
  rank: integer("rank").notNull(),
  teamName: text("team_name").notNull(),
}, (table) => [uniqueIndex("ranking_picks_pred_league_rank_idx").on(table.predictionId, table.league, table.rank)]);

export const titlePicks = sqliteTable("title_picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  predictionId: integer("prediction_id").notNull().references(() => predictions.id, { onDelete: "cascade" }),
  league: text("league").$type<League>().notNull(),
  category: text("category").$type<TitleCategory>().notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name"),
}, (table) => [uniqueIndex("title_picks_pred_league_cat_idx").on(table.predictionId, table.league, table.category)]);

export const actualTeamStandings = sqliteTable("actual_team_standings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  league: text("league").$type<League>().notNull(),
  rank: integer("rank").notNull(),
  teamName: text("team_name").notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  snapshotDate: integer("snapshot_date", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  isFinal: integer("is_final", { mode: "boolean" }).default(false).notNull(),
}, (table) => [uniqueIndex("actual_standings_season_league_rank_date_idx").on(table.seasonId, table.league, table.rank, table.snapshotDate)]);

export const actualTitleSnapshots = sqliteTable("actual_title_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  league: text("league").$type<League>().notNull(),
  category: text("category").$type<TitleCategory>().notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name"),
  value: real("value"),
  snapshotDate: integer("snapshot_date", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  isFinal: integer("is_final", { mode: "boolean" }).default(false).notNull(),
}, (table) => [uniqueIndex("actual_title_season_league_cat_date_idx").on(table.seasonId, table.league, table.category, table.snapshotDate)]);

export const scoreSnapshots = sqliteTable("score_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  rankingScore: integer("ranking_score").default(0).notNull(),
  titleScore: integer("title_score").default(0).notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  rank: integer("rank"),
  snapshotDate: integer("snapshot_date", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [uniqueIndex("score_user_season_date_idx").on(table.userId, table.seasonId, table.snapshotDate)]);

export const awards = sqliteTable("awards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").$type<AwardType>().notNull(),
  label: text("label").notNull(),
  month: integer("month"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// Battle groups
export const battleGroups = sqliteTable("battle_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdBy: integer("created_by").references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// Group membership
export const battleGroupMembers = sqliteTable("battle_group_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id").notNull().references(() => battleGroups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [uniqueIndex("bgm_group_user_idx").on(table.groupId, table.userId)]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({ predictions: many(predictions), scoreSnapshots: many(scoreSnapshots), awards: many(awards), battleGroupMembers: many(battleGroupMembers) }));
export const seasonsRelations = relations(seasons, ({ many }) => ({ predictions: many(predictions), actualTeamStandings: many(actualTeamStandings), actualTitleSnapshots: many(actualTitleSnapshots), scoreSnapshots: many(scoreSnapshots), awards: many(awards) }));
export const predictionsRelations = relations(predictions, ({ one, many }) => ({ user: one(users, { fields: [predictions.userId], references: [users.id] }), season: one(seasons, { fields: [predictions.seasonId], references: [seasons.id] }), rankingPicks: many(rankingPicks), titlePicks: many(titlePicks) }));
export const rankingPicksRelations = relations(rankingPicks, ({ one }) => ({ prediction: one(predictions, { fields: [rankingPicks.predictionId], references: [predictions.id] }) }));
export const titlePicksRelations = relations(titlePicks, ({ one }) => ({ prediction: one(predictions, { fields: [titlePicks.predictionId], references: [predictions.id] }) }));
export const actualTeamStandingsRelations = relations(actualTeamStandings, ({ one }) => ({ season: one(seasons, { fields: [actualTeamStandings.seasonId], references: [seasons.id] }) }));
export const actualTitleSnapshotsRelations = relations(actualTitleSnapshots, ({ one }) => ({ season: one(seasons, { fields: [actualTitleSnapshots.seasonId], references: [seasons.id] }) }));
export const scoreSnapshotsRelations = relations(scoreSnapshots, ({ one }) => ({ user: one(users, { fields: [scoreSnapshots.userId], references: [users.id] }), season: one(seasons, { fields: [scoreSnapshots.seasonId], references: [seasons.id] }) }));
export const awardsRelations = relations(awards, ({ one }) => ({ user: one(users, { fields: [awards.userId], references: [users.id] }), season: one(seasons, { fields: [awards.seasonId], references: [seasons.id] }) }));
export const battleGroupsRelations = relations(battleGroups, ({ one, many }) => ({ creator: one(users, { fields: [battleGroups.createdBy], references: [users.id] }), members: many(battleGroupMembers) }));
export const battleGroupMembersRelations = relations(battleGroupMembers, ({ one }) => ({ group: one(battleGroups, { fields: [battleGroupMembers.groupId], references: [battleGroups.id] }), user: one(users, { fields: [battleGroupMembers.userId], references: [users.id] }) }));

export type GameStatus = "scheduled" | "in_progress" | "final" | "postponed" | "cancelled";
export type GameLeague = "central" | "pacific" | "interleague";

export const gameResults = sqliteTable("game_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  gameDate: text("game_date").notNull(),
  league: text("league").$type<GameLeague>().notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  status: text("status").$type<GameStatus>().notNull(),
  winner: text("winner"),
  stadium: text("stadium"),
  snapshotDate: integer("snapshot_date", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [uniqueIndex("game_results_season_date_home_away_idx").on(table.seasonId, table.gameDate, table.homeTeam, table.awayTeam)]);

export const gameResultsRelations = relations(gameResults, ({ one }) => ({
  season: one(seasons, { fields: [gameResults.seasonId], references: [seasons.id] }),
}));

export const scrapeFailureEvents = sqliteTable("scrape_failure_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  errorMessage: text("error_message"),
  httpStatus: integer("http_status"),
  htmlSnippet: text("html_snippet"),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// Likes (anonymous, fingerprint-based)
export const likes = sqliteTable("likes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetUserId: integer("target_user_id").notNull().references(() => users.id),
  fingerprint: text("fingerprint").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [uniqueIndex("likes_user_fp_idx").on(table.targetUserId, table.fingerprint)]);

export const likesRelations = relations(likes, ({ one }) => ({ user: one(users, { fields: [likes.targetUserId], references: [users.id] }) }));
