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
      'iwata-minoru',
      'T-岡田',
      '上田二朗',
      '中田廉',
      '中田良弘',
      '亀山つとむ',
      '井上一樹',
      '井川-慶',
      '井端弘和',
      '今中慎二',
      '今岡真訪',
      '今成亮太',
      '今江敏晃',
      '伊勢孝夫',
      '伊原春樹',
      '佐々岡真司',
      '佐伯貴弘',
      '佐藤義則',
      '八木裕',
      '出野哲也',
      '前田幸長',
      '前田智徳',
      '加藤伸一',
      '原口文仁',
      '吉見一起',
      '土井正博',
      '堀内恒夫',
      '大下剛史',
      '大友進',
      '大宮龍男',
      '大野-豊',
      '宇野勝',
      '安仁屋宗八',
      '安倍友裕',
      '安藤統男',
      '小川淳司',
      '小早川毅彦',
      '小笠原道大',
      '山崎武司',
      '岡-義朗',
      '岩本-勉',
      '岩瀬仁紀',
      '島田誠',
      '川又米利',
      '平石洋介',
      '平野謙',
      '広澤克実',
      '彦野利勝',
      '得津高宏',
      '柴原-洋',
      '柴原洋',
      '桧山進次郎',
      '横山竜士',
      '氏原英明',
      '江尻慎太郎',
      '江本孟紀',
      '濱中-治',
      '濱中治',
      '片岡篤史',
      '田代将太郎',
      '田尾安志',
      '矢野燿大',
      '石川雄洋',
      '福本-豊',
      '福本豊',
      '福留孝介',
      '秋山幸二',
      '糸井嘉男',
      '若松-勉',
      '荒木雅博',
      '藤原-満',
      '藤原満',
      '藤本博史',
      '藤田-平',
      '藪恵壹',
      '西尾典文',
      '西村龍次',
      '谷-佳知',
      '遠藤一彦',
      '野口寿浩',
      '野村謙二郎',
      '金子侑司',
      '金村暁',
      '金村義明',
      '鈴木啓示',
      '長谷部裕',
      '門倉健',
      '関本四十四',
      '関本賢太郎',
      '須田幸太',
      '須藤-豊',
      '高木由一',
      '高橋由伸',
      '高津臣吾',
      '髙橋尚成',
      '黒江透修',
      '黒田正宏',
      'Ｔ-岡田',
      'ｷﾞｬｵｽ内藤'
    )
  );
