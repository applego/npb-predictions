# 獲得・収益化の運用

循環の実行契約は [loop.md](../../docs/growth/loop.md)、他Agentの実読・次の担当範囲は
[handoff.md](../../docs/growth/handoff.md)、安全な実測投影は [status.json](../../docs/growth/status.json)。
ローカルmemoryに書いたことだけで配信・受領済みとせず、これらを同じPRで共有する。

正本: GOAL.md / .agents/goal-loop.json。進捗: npb-predictions-3lw。担当: このrepoの定期実行。
毎回、現行GOALと仮説・未判定実験を読み、公開データと外部指標を再測定する。最重要の利用者成果に必要な関連修正を40分以内でまとめ、修正件数やPR作成を終了理由にしない。
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
日別タブ数は人数ではなく日を跨ぐ重複を含む。日付はUTCでサーバーと揃える。
GETの `rows` は年度/リーグ/source別内訳、`dailyTotals` は日別・event別のscope横断distinctとX由来distinct。
日別タブの28日合計は `dailyTotals` から取得し、内訳のdistinctを足さない。旧reportにdailyTotalsが無ければタブ合計はnull。
X由来は同じタブのsessionStorageにだけ保持し、内部遷移でUTMが消えても維持する。タブを閉じると失われる。
公開前の過去分について翌日未送信を後から復元したり、再訪人数へ変換しない。X intent開始は投稿完了ではない。PVを分母にした因果効果を断定せず、公開後の同一期間で比較。
計測tableはmigrationをCIの公開工程で適用する。手動の本番DB直接書き込みはしない。
レート制限はisolate内のbest-effort（60件/分/IP、最大1万bucket）。全体費用上限の保証ではない。日付が変わった最初の書込時に90日より古いイベントを削除する。

## 保存版を補完する公開API

取得契約: `GET /api/rankings/commentators?year=2026&league=all&format=archive`。
`npb-public-results-export.v1` は、指定年度にロック済み予想を持つ解説者を対象に、片リーグのみ・不完全・順位なしの登録も含め、ロック済み候補を全件返す。
一般参加者・system・未ロック予想・当年のロック済み予想がない人物は対象外。全登録者と呼ばない。
`population` に候補数・採用数と各リーグの比較可能数、`predictions` に採用前の候補と `selected` を持つ。
採用順は人物単位で予想側の通常版（null/空文字）優先→登録時刻昇順→prediction ID昇順。リーグや的中度の評価より先に選ぶ。
`lockedAt=null` は証拠欠測を保つ。現在のDBのlockフラグから当時のlock時刻を推測しない。
`personSource` / `personSourceUrl` は人物メタデータであり、当年・リーグ・予想variantの出典検証を代用しない。
`provenance` は取得元URL・観測時刻とpayload hashを持つ。hashはprovenanceを除いたresponseの `JSON.stringify` をUTF-8でSHA-256化する。
保存時はレスポンス全体をそのまま保持してhashを再計算し、母集団と候補・採用証跡を落とさない。
このAPIはlive DBを読む。上限超過は503で返し、以前の部分保存版を完全なexportとして代用しない。
通常の `league=all` ランキングは両リーグの比較専用であり、全対象の保存版取得元には使わない。
既存 `data/public-results-2026.json` は当時の公開API保存分のまま。新export取得・検証前に収録範囲やlock確認済みの主張を広げない。
再発防止: routeの実SQLをSQLiteで実行するVitestと、CF PagesのローカルD1を通る `web/e2e/public-results-export.e2e.ts`。


保存工程は `web/scripts/build-public-results-archive.ts YEAR PUBLIC_EXPORT SEASONS_EXPORT NEW_OUTPUT`。
webディレクトリから既存のtsxで実行する。公開適用が承認された後に上記APIの応答全体と `/api/seasons` を取得し、
新しい出力ファイルへ保存する。旧ランキング形式、payload hash不一致、母集団/採用ID不一致、未知の私有列を拒否する。
公式の当該年度NPBページの全日程終了と両リーグ6球団を再確認する。出力はv2で、`publicExport` に全応答、
`population` に定義済み母集団、`commentators` に正規採用の片リーグ・空・不完全な登録を残す。
取得元の観測日時・raw file SHA-256・payload hashを別々に保持し、lock時刻欠測を埋めない。
hashは整合性の証拠であり真正性や当時のlock時刻の証明ではない。既存ファイルへの上書きは拒否する。
この生成物の本番採用は別工程。現在の部分保存版とUIの収録範囲表示を自動で置き換えない。
表示側はv1/v2を区別し、v2は全応答内の正規採用行を正本に予想ID・登録日時を引き継ぐ。空・不完全な採用行も対象外件数に含め、ロック日時の未記録件数と定義済み母集団を明示する。v1の部分保存分の説明は維持する。実際の全対象artifactを取得・照合してから、別承認の公開経路を使う。
