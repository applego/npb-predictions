-- E2E-only synthetic result journeys. Apply AFTER production-seed validation.
-- Synthetic reviewers for result journeys. The normal seed contains only
-- Pacific picks for commentators: never fill real people's missing forecasts.
INSERT OR IGNORE INTO users (name, slug, role, source, source_url)
VALUES ('検証用 解説者A', 'e2e-result-a', 'commentator', '検証番組', 'https://example.com/result-a'),
       ('検証用 解説者A', 'e2e-result-a-copy', 'commentator', '検証番組', 'https://example.com/result-a'),
       ('検証用 解説者B', 'e2e-result-b', 'commentator', '検証新聞', NULL);
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked, variant)
SELECT u.id, s.id, 1, 'e2e-results' FROM users u JOIN seasons s ON s.year=2026
WHERE u.slug IN ('e2e-result-a', 'e2e-result-a-copy', 'e2e-result-b');
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name)
SELECT p.id, a.league,
  CASE WHEN u.slug='e2e-result-b' AND a.rank IN (1,2) THEN 3-a.rank ELSE a.rank END,
  a.team_name
FROM actual_team_standings a
JOIN seasons s ON s.id=a.season_id AND s.year=2026
JOIN predictions p ON p.season_id=s.id AND p.variant='e2e-results'
JOIN users u ON u.id=p.user_id AND u.slug IN ('e2e-result-a','e2e-result-a-copy','e2e-result-b')
WHERE a.snapshot_date=(SELECT max(x.snapshot_date) FROM actual_team_standings x WHERE x.season_id=a.season_id AND x.league=a.league);

-- Synthetic privacy boundary fixture: never use real credentials or user data.
INSERT OR IGNORE INTO users (name, slug, role, email, firebase_uid)
VALUES ('検証用 非公開予想', 'e2e-private-draft', 'friend', 'draft@example.invalid', 'e2e-draft-uid'),
       ('検証用 公開予想', 'e2e-public-locked', 'friend', 'locked@example.invalid', 'e2e-locked-uid');
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked, variant)
SELECT u.id, s.id, CASE WHEN u.slug='e2e-public-locked' THEN 1 ELSE 0 END, 'privacy-fixture'
FROM users u JOIN seasons s ON s.year=2026 WHERE u.slug IN ('e2e-private-draft','e2e-public-locked');
