UPDATE `users` SET `name` = '大矢', `role` = 'friend' WHERE `slug` = 'oya';
--> statement-breakpoint
UPDATE `users` SET `name` = '常重', `role` = 'friend' WHERE `slug` = 'tsuneshige';
--> statement-breakpoint
UPDATE `users` SET `name` = '熊谷', `role` = 'friend' WHERE `slug` = 'kumagae';
--> statement-breakpoint
UPDATE `users`
SET `role` = 'commentator'
WHERE `slug` NOT IN ('oya', 'tsuneshige', 'kumagae', 'ishiro', 'kuramoto')
  AND `name` NOT LIKE '%最終順位%'
  AND `name` NOT LIKE '%AI%'
  AND `name` NOT LIKE '%ChatGPT%'
  AND `name` NOT LIKE '%GPT%'
  AND `name` NOT LIKE '%Gemini%'
  AND `name` NOT LIKE '%編集部%'
  AND `name` NOT LIKE '%記者%'
  AND `name` NOT LIKE '%AERA%'
  AND `name` NOT LIKE '%朝日新聞%'
  AND `name` NOT LIKE '%SPAIA%'
  AND `name` NOT LIKE '%読者%'
  AND `name` NOT LIKE '%アンケート%'
  AND `name` NOT LIKE '%平均%'
  AND `name` NOT LIKE '%合計%'
  AND `name` NOT LIKE '%データ%'
  AND COALESCE(`source`, '') NOT LIKE '%最終順位%'
  AND COALESCE(`source`, '') NOT LIKE '%AI%'
  AND COALESCE(`source`, '') NOT LIKE '%ChatGPT%'
  AND COALESCE(`source`, '') NOT LIKE '%GPT%'
  AND COALESCE(`source`, '') NOT LIKE '%Gemini%'
  AND COALESCE(`source`, '') NOT LIKE '%編集部%'
  AND COALESCE(`source`, '') NOT LIKE '%記者%'
  AND COALESCE(`source`, '') NOT LIKE '%AERA%'
  AND COALESCE(`source`, '') NOT LIKE '%朝日新聞%'
  AND COALESCE(`source`, '') NOT LIKE '%SPAIA%'
  AND COALESCE(`source`, '') NOT LIKE '%読者%'
  AND COALESCE(`source`, '') NOT LIKE '%アンケート%'
  AND COALESCE(`source`, '') NOT LIKE '%平均%'
  AND COALESCE(`source`, '') NOT LIKE '%合計%'
  AND COALESCE(`source`, '') NOT LIKE '%データ%'
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
