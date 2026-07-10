-- Seed the private core-five battle group used by the first release cohort.
INSERT OR IGNORE INTO battle_groups (name, slug, created_by, invite_code)
SELECT 'コア5人リーグ', 'core-five', u.id, 'CORE5X'
FROM users u
WHERE u.slug = 'tsuneshige';
--> statement-breakpoint
UPDATE battle_groups
SET
  name = 'コア5人リーグ',
  created_by = (SELECT id FROM users WHERE slug = 'tsuneshige'),
  invite_code = 'CORE5X'
WHERE slug = 'core-five'
  AND EXISTS (SELECT 1 FROM users WHERE slug = 'tsuneshige');
--> statement-breakpoint
INSERT OR IGNORE INTO battle_group_members (group_id, user_id)
SELECT g.id, u.id
FROM battle_groups g
JOIN users u ON u.slug IN ('oya', 'ishiro', 'kuramoto', 'tsuneshige', 'kumagae')
WHERE g.slug = 'core-five';
