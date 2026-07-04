#!/bin/bash
set -e

# NPB Predictions — Remote D1 Migration & Deploy Script
# Usage: bash scripts/deploy-remote.sh

DB_NAME="npb-predictions"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"

cd "$WEB_DIR"

echo "══════════════════════════════════════"
echo "  NPB Predictions — Remote Deploy"
echo "══════════════════════════════════════"

# 1. Schema migrations
echo ""
echo "=== 1. Schema Migrations ==="

echo "  Adding missing columns to users..."
npx wrangler d1 execute "$DB_NAME" --remote --command "
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'friend' NOT NULL;
" 2>/dev/null || echo "  (role column may already exist)"

npx wrangler d1 execute "$DB_NAME" --remote --command "
ALTER TABLE users ADD COLUMN source TEXT;
" 2>/dev/null || echo "  (source column may already exist)"

npx wrangler d1 execute "$DB_NAME" --remote --command "
ALTER TABLE users ADD COLUMN variant TEXT;
" 2>/dev/null || echo "  (variant column may already exist)"

npx wrangler d1 execute "$DB_NAME" --remote --command "
ALTER TABLE users ADD COLUMN firebase_uid TEXT;
" 2>/dev/null || echo "  (firebase_uid column may already exist)"

npx wrangler d1 execute "$DB_NAME" --remote --command "
ALTER TABLE users ADD COLUMN email TEXT;
" 2>/dev/null || echo "  (email column may already exist)"

echo "  Adding variant to predictions..."
npx wrangler d1 execute "$DB_NAME" --remote --command "
ALTER TABLE predictions ADD COLUMN variant TEXT;
" 2>/dev/null || echo "  (variant column may already exist)"

echo "  Creating battle_groups table..."
npx wrangler d1 execute "$DB_NAME" --remote --command "
CREATE TABLE IF NOT EXISTS battle_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by INTEGER REFERENCES users(id),
  invite_code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
"

echo "  Creating battle_group_members table..."
npx wrangler d1 execute "$DB_NAME" --remote --command "
CREATE TABLE IF NOT EXISTS battle_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  group_id INTEGER NOT NULL REFERENCES battle_groups(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  joined_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS bgm_group_user_idx ON battle_group_members(group_id, user_id);
"

echo "  Creating site_settings table..."
npx wrangler d1 execute "$DB_NAME" --remote --command "
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('color_theme', 'broadcast'),
  ('font_number', 'saira'),
  ('font_body', 'noto');
UPDATE site_settings SET value = 'broadcast', updated_at = unixepoch()
  WHERE key = 'color_theme' AND value = 'editorial-navy-ivory';
UPDATE site_settings SET value = 'saira', updated_at = unixepoch()
  WHERE key = 'font_number' AND value = 'bebas';
"

echo "  Creating user_settings table..."
npx wrangler d1 execute "$DB_NAME" --remote --command "
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_key_idx ON user_settings(user_id, key);
"

echo "  ✅ Schema migrations complete"

# 2. Export local data and import to remote
echo ""
echo "=== 2. Data Sync ==="

LOCAL_DB=".wrangler/state/v3/d1/miniflare-D1DatabaseObject/ebe107f426ba83322c62809723b53c3169b31ddb2289bafa01897cad3061e808.sqlite"

if [ ! -f "$LOCAL_DB" ]; then
  echo "  ❌ Local DB not found: $LOCAL_DB"
  exit 1
fi

# Export seasons
echo "  Syncing seasons..."
sqlite3 "$LOCAL_DB" "SELECT year, label, is_active FROM seasons ORDER BY year;" | while IFS='|' read -r year label active; do
  npx wrangler d1 execute "$DB_NAME" --remote --command "
    INSERT OR IGNORE INTO seasons (year, label, is_active, created_at) VALUES ($year, '$label', $active, unixepoch());
  " 2>/dev/null
  echo "    $year"
done

# Export actual standings
echo "  Syncing actual standings..."
sqlite3 "$LOCAL_DB" "
  SELECT s.year, a.league, a.rank, a.team_name, a.is_final
  FROM actual_team_standings a
  JOIN seasons s ON a.season_id = s.id
  ORDER BY s.year, a.league, a.rank;
" | while IFS='|' read -r year league rank team final; do
  npx wrangler d1 execute "$DB_NAME" --remote --command "
    INSERT OR IGNORE INTO actual_team_standings (season_id, league, rank, team_name, wins, losses, draws, snapshot_date, is_final)
    SELECT id, '$league', $rank, '$team', 0, 0, 0, unixepoch(), $final
    FROM seasons WHERE year = $year;
  " 2>/dev/null
done
echo "  ✅ Actual standings synced"

echo ""
echo "=== 3. Build & Deploy ==="
npm run ci:full 2>&1 | tail -5

echo ""
echo "=== 4. Deploy to Cloudflare Pages ==="
npx wrangler pages deploy .vercel/output/static 2>&1 | tail -5

echo ""
echo "══════════════════════════════════════"
echo "  ✅ Deploy complete!"
echo "══════════════════════════════════════"
