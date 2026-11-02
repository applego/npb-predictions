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

-- Synthetic participant who saved a prediction before the season (2026-03-20 12:00 JST) and was
-- locked at opening (2026-03-27 18:00 JST) by the lock job. Picks swap 1st/2nd of the standings.
INSERT OR IGNORE INTO users (name, slug, role, email, firebase_uid)
VALUES ('検証用 登録済み', 'e2e-registered', 'friend', 'registered@example.invalid', 'e2e-registered-uid');
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked, locked_at, created_at, updated_at, variant)
SELECT u.id, s.id, 1, 1774602000, 1773975600, 1773975600, 'default'
FROM users u JOIN seasons s ON s.year=2026 WHERE u.slug='e2e-registered';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name)
SELECT p.id, a.league, CASE WHEN a.rank IN (1,2) THEN 3-a.rank ELSE a.rank END, a.team_name
FROM actual_team_standings a
JOIN seasons s ON s.id=a.season_id AND s.year=2026
JOIN predictions p ON p.season_id=s.id AND p.variant='default'
JOIN users u ON u.id=p.user_id AND u.slug='e2e-registered'
WHERE a.snapshot_date=(SELECT max(x.snapshot_date) FROM actual_team_standings x WHERE x.season_id=a.season_id AND x.league=a.league);
-- The hand-locked participant (no lock time on record) gets picks too, so the sheet's refusal is a real check.
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name)
SELECT p.id, a.league, a.rank, a.team_name
FROM actual_team_standings a
JOIN seasons s ON s.id=a.season_id AND s.year=2026
JOIN predictions p ON p.season_id=s.id AND p.variant='privacy-fixture'
JOIN users u ON u.id=p.user_id AND u.slug='e2e-public-locked'
WHERE a.snapshot_date=(SELECT max(x.snapshot_date) FROM actual_team_standings x WHERE x.season_id=a.season_id AND x.league=a.league);
