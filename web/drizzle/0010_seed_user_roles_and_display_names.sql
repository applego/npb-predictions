UPDATE `users` SET `name` = '大矢', `role` = 'friend' WHERE `slug` = 'oya';
--> statement-breakpoint
UPDATE `users` SET `name` = '常重', `role` = 'friend' WHERE `slug` = 'tsuneshige';
--> statement-breakpoint
UPDATE `users` SET `name` = '熊谷', `role` = 'friend' WHERE `slug` = 'kumagae';
--> statement-breakpoint
UPDATE `users`
SET `role` = 'commentator'
WHERE `slug` IN (
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
);
