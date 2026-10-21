# 獲得・収益化の運用

正本: GOAL.md / .agents/goal-loop.json。進捗: npb-predictions-3lw。担当: このrepoの定期実行。
毎回、現行GOALと仮説・未判定実験を読み、公開データと外部指標を再測定し、最初の不足を1件修復する。
無料のコード/UI/SEO改善は検証・PRまで進める。公開・費用・契約・権限は具体的材料をdecisionsへ。
外部APIキーをログに出さず、既存CLI・envのキー存在・専用設定・OS keychainのmetadataを調べる。

計測: python3 scripts/growth/measure.py。public_result_routesはHTTP応答でありユーザー数でも利益でもない。
解析・ASPデータはread-onlyな正規取得経路をacquire担当が接続する。
外部export receiptは ~/.config/npb-predictions/growth-receipt.json (0600) に置く。
origin、window_days=28、data_through（timezone必須）、metrics（GOALの指標idごとの数値）、sources（指標ごとの外部証拠URLまたはexport ID）を必須とする。
profitは確定売上−返金−手数料−直接費（Agent/API/data/infra含む）を照合してから入れる。
0円は全sourceを確認した場合だけ。値の無い時に空のreceiptや0円を生成してはならない。
receiptは証拠へのpointerでありsource自体の正確さの保証ではない。毎週照合する。

共有するのは来訪ユーザー本人。結果カードと文面を提供する。運営投稿は対象外。
2026シーズン終了後も最終フラグ未確認なら「暫定」を維持する。本番DBを直接書き換えない。

収益: A8.net候補1件とAdSenseを比較。前者は案件提携・条件確認が先、後者は審査と独自コンテンツが先。
初回は観戦ガイドの単一案件を推奨する仮説。契約・単価・販売実績は未確認。
定期実行の上限は1回40分/無料の既存CLIのみ。同じ外部待ちは新規施策を増やさず判断キューに保持。
無変化の通知はしない。公開障害・新しい外部成果・人間必須の判断だけ通知。
停止: ~/.config/npb-predictions/goal-loop.stop を作る。再開: 停止ファイルをtrashへ移動。

publications.monetization={approved_href, program_id, approval_ref} は人間の承認後だけ記録し、
/resources の実HTML上の同一リンク・sponsored・PRを確認する。掲載完了と確定収益は別工程。

自前の一次計測: /api/growth/events（GETは既存admin認証必須）。result_view / x_share_start / card_download を年度・リーグ・日別で集計。
識別はtab限定ランダム値を日付とhash化。氏名・メール・IP・永続fingerprintをDBへ保存しない。DNT=1は送信しない。
日別タブ数は人数ではなく重複を含む。X intent開始は投稿完了ではない。PVを分母にした因果効果を断定せず、公開後の同一期間で比較。
計測tableはmigrationをCIの公開工程で適用する。手動の本番DB直接書き込みはしない。
レート制限はisolate内のbest-effort（60件/分/IP、最大1万bucket）。全体費用上限の保証ではない。日付が変わった最初の書込時に90日より古いイベントを削除する。
