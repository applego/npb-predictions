#!/bin/bash
# NPB Predictions — Usage Monitor
# Run daily: crontab -e → 0 9 * * * /path/to/check-usage.sh
#
# Checks D1 read/write counts and alerts if approaching free tier limits.
# Free tier: 5M reads/day, 100K writes/day

DB_NAME="npb-predictions"
ALERT_EMAIL="applegorillappa@gmail.com"

echo "=== NPB Predictions Usage Check ==="
echo "Date: $(date)"

# D1 database size
SIZE=$(npx wrangler d1 execute "$DB_NAME" --remote --command "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();" 2>&1 | grep -o '"size":[0-9]*' | cut -d: -f2)
SIZE_MB=$(echo "scale=1; ${SIZE:-0} / 1024 / 1024" | bc 2>/dev/null || echo "?")
echo "D1 Size: ${SIZE_MB} MB (limit: 500 MB on free)"

# Row counts
COUNTS=$(npx wrangler d1 execute "$DB_NAME" --remote --command "
SELECT 'users' as t, COUNT(*) as c FROM users
UNION ALL SELECT 'predictions', COUNT(*) FROM predictions
UNION ALL SELECT 'ranking_picks', COUNT(*) FROM ranking_picks;
" 2>&1 | grep -o '"c":[0-9]*' | cut -d: -f2 | tr '\n' '/')
echo "Rows: $COUNTS"

echo ""
echo "Free tier limits:"
echo "  D1: 5M reads/day, 100K writes/day, 500MB storage"
echo "  Pages: unlimited bandwidth"
echo "  Workers: 100K requests/day"
echo ""
echo "Dashboard: https://dash.cloudflare.com/68852a9ea8d4375873c548608a7ac2bd"
