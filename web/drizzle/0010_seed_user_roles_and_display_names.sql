UPDATE `users` SET `name` = '大矢', `role` = 'friend' WHERE `slug` = 'oya';
--> statement-breakpoint
UPDATE `users` SET `name` = '常重', `role` = 'friend' WHERE `slug` = 'tsuneshige';
--> statement-breakpoint
UPDATE `users` SET `name` = '熊谷', `role` = 'friend' WHERE `slug` = 'kumagae';
--> statement-breakpoint
UPDATE `users`
SET `role` = 'commentator'
WHERE `slug` NOT IN ('oya', 'tsuneshige', 'kumagae', 'ishiro', 'kuramoto')
  AND (
    `source` IS NOT NULL
    OR `variant` IS NOT NULL
    OR `slug` IN (
      'kondo-hiroshi',
      'ichieda-shuhei',
      'yamada-hisashi',
      'mayumi-akinobu',
      'nashida-masataka',
      'oishi-daijiro',
      'nakanishi-kiyoki',
      'ogata-koichi',
      'hiyama-shinjiro',
      'hamana-chihiro',
      'imaoka-masato',
      'toritani-takashi',
      'hiraishi-yosuke',
      'satozaki-tomoya',
      'uehara-koji',
      'tanishige-motonobu',
      'miyamoto-shinya',
      'sasaki-kazuhiro',
      'ogata-koichi-b',
      'watanabe-hisanobu',
      'tamura-fujio',
      'shinozuka-kazunori',
      'nishimoto-hijiri',
      'iwata-minoru'
    )
    OR `id` IN (
      SELECT p.`user_id`
      FROM `predictions` p
      JOIN `ranking_picks` rp ON rp.`prediction_id` = p.`id`
      GROUP BY p.`user_id`
      HAVING COUNT(DISTINCT p.`season_id`) > 1
    )
  );
