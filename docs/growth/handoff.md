# NPB獲得・収益化の引継ぎ（2026-10-24）

この文書はbrと固定sourceの投影。現在の仕事・担当・待ちはrepo-local brが正本。
過去の「次のreadyは3lw.2」という引継ぎを置換する。本回でその修復コードをPR80へ反映した。
到達は2/4: PR。本番main408cf07へ未反映で、merge/deployは実行していない。

## 固定sourceと共有capture

- 修復code source: f5ea3e23c9f14060bb8e0f3fd01756525dd2b9e4
- PR: https://github.com/applego/npb-predictions/pull/80
- tracker: npb-predictions-3lw.2 / owner: npb-automation
- status source_head: f5ea3e23c9f14060bb8e0f3fd01756525dd2b9e4
- source_digest: e30233b1b90656953f53c94f4065ff770e50e9084df6b16bc5054cf57d346c22
- fingerprint: fcf75021189b64021368a2a86616bd09a8b2c1e2efe44ed77e9d9bc481535bd0

mainに入口が無いため、既存bootstrap laneを利用した。origin/branch/9dddab1祖先/実行sourceとcommitted HEADの一致を確認。
main適用後はmain由来の場へ移しbootstrap依存を外す。共有rootの既存dirtyは取り込んでいない。
dailyの一次計測1回→weekly→graphを実行し、終了時のtracker変化は同captureの再評価からpublishした。
source_digestは契約の指紋であり、API全コードのhashではない。修復実体は上の固定code sourceを参照する。

## 今回修復した利用者成果

公開予想でメール・Firebase UID・未ロック予想を返さず、本人は自分の予想を比較・閲覧できる。
公開season API2つはユーザー列のallowlistとlocked条件。本人GET /api/seasons/[year]/meは検証済みtokenのuser.id限定、private/no-store。
自己比較とマイページを本人GETへ移行し、初回連携待ち・401/503・404・取消を区別する。
公開profile/予想OG3経路、SEO/news/解説者詳細/公開成績の取得にもlocked条件を適用した。
実ユーザーの私有値は取得していない。実データ漏洩を観測したという記録ではない。

## 検証と独立受領

旧公開APIへ戻した反例3FAIL、旧画像へ戻した反例FAIL。生成SQLを実SQLiteで実行する入口8件と既存auth10件PASS。
横展開時の全331単体、型・対象lint・Next/CF build・データ・性能budget PASS。
実localD1の2公開API/401と実Chromiumの連携遅延→取得0→連携完了後1列、503/404区別、マイページを操作し2/2PASS。
1400/390/320pxの横はみ出し0、成功時console/pageerror0。認証相手は合成境界で、本番ログイン成功ではない。
初回E2Eの初期選択人数期待ミス、次の30秒timeoutは失敗として保存し、最終再検証だけをPASSにしている。

既存チャット「⚾️リーグ結果UIを改善」のCodexがa1b5576/ab40310/f5ea3e2を実読。
旧マイページconsumer・追加OG2経路・初回連携401の3指摘を修復し、f5ea3e2に追加指摘なしと受領を返した。
受領時のfingerprintは0090e82e96bc08e04822b3ba22c97a6b9efb120942834c6ccf5f3d6538b629e7、tracker3lw.2、担当read-only review。
現captureも同Codexがstatus実ファイルを読み、f5ea3e2/digest e30233b1/fingerprint fcf75021189b64021368a2a86616bd09a8b2c1e2efe44ed77e9d9bc481535bd0、
selected_tracker_item=null、tracker3lw.2/read-only review担当を返す受領を確認した。送信だけを受領にしていない。
Claude Code担当の実在/受領は未確認、既知の利用制限を再試行していない。新Agent/chatは作成していない。

6枚の独立目視では認証差分の明確な表示崩れなし。ただし全体Designer Gateは保留。
既存の年度tab選択位置・淡いfilter文字・部分予想の空パlabelを親npb-predictions-3lwへ戻した。
追加の成功/503エラー6枚も独立目視。320/390pxのエラーは枠内、1400pxの本人1列操作は確認。
スマホのダウンロード操作は画像の画面外で目視未確認、画像共有物そのものの品質や本番反映も未確証。
これらの残差を新規改善完了とはせず、全体Designer Gateの保留を維持する。
全体UBSは既知tool停止で未達。部分検査を全体PASSにしていない。CIはPR最新headを照合し、過去greenを流用しない。

## 次ownerとresume

owner=npb-automation。3lw.2/3lw.1/arr/3lw.4は別承認のPR80公開後read-back待ち。
3lw.2: 公開APIの列・未lock404、認証本人比較/マイページを実環境で確認する。
3lw.1/arr: healthを1回確認し、健全な時だけ既存read-only live gate。全対象exportのsource/hash/母集団/正規ID/登録日時/lock欠測を確認する。
今回healthは403で内容未確認、quota回復と判断せずgate/export反復なし。部分保存版を全登録者/当時lock確認済みにしない。
3lw.4: resources公式案内・戻り導線の本番read-back、実在するASP/費用sourceが接続できた時だけ同期間照合する。
全体UIの残差は親3lw、最終CI/レビューと品質制限はPRで確認する。既存認証待ちは設定/session変化まで再探索しない。

## 主指標と運用の境界

利益・ASP・人数・共有/保存・X由来閲覧はnull。HTTP応答3は表示の意味・人数・利益ではない。
2実験は公開時刻/SHA/比較条件待ち、開始/成功を認定せず新実験なし。1円/28日の目標は暫定。
結果閲覧は日別匿名タブ延べ数、共有/保存は開始、X投稿完了/OS保存完了/再訪人数へ読み替えない。
6利益経路と共有/再訪を比較し、今回NPB公式2026中継案内を再読した。契約/需要/売上の証拠ではない。

native dry-runはmain408cf07のheld_measurement。今回は更新済みCodex automationから実PDCAとready修復を実行した。
新native executorやschedulerを足していない。native main契約の適用・本番稼働の完了とは別。
PR/受領/検証/通知は利益ではない。本番deploy/main merge/外部投稿/契約/支出/秘密権限/本番DB操作は実行していない。
