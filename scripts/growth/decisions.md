# 確認が必要な事項

## X共有の目的（確定済み）

ユーザー訂正2026-10-21: 来訪者が自分のXで公開したくなる確率を高める。
運営アカウントの公開・投稿先確認は対象外。結果カード・文面・深いリンクを用意する。
X投稿画面を開いただけでは投稿完了としない。実流入と共有開始を別々に計測する。

## 初回の収益手段

推奨: 観戦ガイドの視聴案件1件でアフィリエイトを検証。案件の存在・報酬はログイン後の一次情報確認まで未確定。
代替: AdSense。独自コンテンツ・サイト所有・ポリシー審査後に広告コード公開を別判断。
材料: MONETIZATION.md、https://www.a8.net/howto/entry.html、https://support.google.com/adsense/answer/9724?hl=ja （2026-10-21参照）。
契約・提携・広告コード・確定URLの公開は個別判断。未回答なら未承認リンク・広告は追加しない。
収益source認証不足なら、キー値を示さずサービス名と接続先をここに追記する。

## 主指標の目標値

推奨: 2026-11-18までの初回28日で貢献利益1円以上（暫定）。
代替: 収益source接続後に固定額の目標を決める。未確定の間は達成認定しない。
費用枠: 新規従量課金・広告出稿は0円。費用発生は別判断。

## D1回復後の公開保存版補完（2026-10-21定期実行）

19:50 JST実測: main/public SHA=`344dbfa`。feature-healthの4sourceすべてがD1日次無料row-read上限超過。
保存版coreは実ブラウザでパ209件・セ270件の収録表示と確定結果を確認。全登録者・正規lock確認済みの保存版とは認定しない。
回復条件はUTC 00:00（JST 09:00）、次回対象は2026-10-22 09:45 JST。上限中に同じ失敗を反復しない。
材料: `npb-predictions-3lw.1`、`web/scripts/check-live-release.sh`、公開 `/api/cron/feature-health`、保存用APIのREADME契約。
回復後はfeature-healthを1回read-onlyで確認し、回復していれば既存画像API/scoreboardのlive release gateをread-onlyで検証する。
保存用API修復はPR段階で止める。この定期実行ではmain merge（自動deployを誘発）・手動deploy・workflow dispatch・本番DB操作を実行しない。
推奨（判断前の既定）: PRの検証結果を確認し、別途承認された公開経路での適用を待つ。既存の最終結果更新が不足する場合だけ、既存daily workflowを1回使う案をここへ追加する。
代替: 当時保存分の限定表示を維持。影響: パのみ登録と採用証跡の補完は待機する。有料プランへの変更は提案・実行しない。

## 収益・費用sourceのread-only接続（2026-10-21調査）

秘密値を出さずにenvキー名、専用設定、OS keychainのサービスmetadata、GitHub Secret名、Wrangler認証metadataを確認した。
ローカルのNPB設定にはgrowth receiptが無く、環境にNPB admin bearer/ASP用キーも無い。GitHubにcron用Secretは存在するが、値は取得できず、admin権限とも同一視しない。
Wrangler OAuth設定は存在するが `whoami --json` は認証token取得400で失敗。ログイン済み・Cloudflare費用取得済みとはしない。
接続済みGmailで2026-09-23〜10-21のA8/Cloudflareの確定成果・請求関連を限定検索した結果は0件。契約不存在・売上0・費用0の証明にはしない。
推奨: 既存Cloudflareセッションの通常ログインをオーナーが回復した後、解析/請求のread-only exportを取得する。権限拡張や新token作成は行わない。
ASPは既存A8メディア会員の有無と対象サイトの契約・確定成果exportが必要。契約先が未確定なら新規登録/提携は個別判断。
費用はASP確定売上・取消/返金・手数料に加え、Agentの利用枠按分/API/data/infraの同期間sourceを揃える。無料枠内・追加支出なしだけで費用0にしない。
未回答時: 外部指標と貢献利益はnull、暫定1円/28日の達成認定を行わない。既存共有実験の観測期限2026-10-28まで重複施策を足さない。
資料: https://developers.cloudflare.com/d1/platform/pricing/ 、https://developers.cloudflare.com/billing/manage/invoices/ 。

## 横展開で見つかった既存公開projection（npb-predictions-3lw.2）

既存 `/api/seasons/[year]/predictions` の認証なしGETが `user:true` で私有列を制限せず返すsourceを確認。現在の実データ返却はD1上限により未確認で、私有値は取得していない。自己比較UIがfirebaseUid公開に依存するため、public列制限と認証済み自己予想取得を一緒に直す必要がある。今回の保存用APIは明示列で除外。1改善の上限を守り、既存親配下のP1 `npb-predictions-3lw.2` へowner=npb-automation、次の作業枠での優先修復として引き受けた。


## 2026-10-22 09:49 JST: D1回復と公開表示障害の切り分け

fresh main/publicは344dbfa。公開feature-healthは4source healthy、D1 quotaエラーは解消。
既存live release gateをATTEMPTS=1で実行し、prediction/season/commentator/standings/ranking-cardのPNG5経路とscoreboardのHTMLはPASS。
新聞画像 `/api/newspaper/hanshin-tigers` は503(text/plain、17bytes)でgate全体はFAIL。HTML/画像の形式・サイズ確認は内容の最終データ確認と別。
実ブラウザの `/rankings/predictions?year=2026&league=pacific` はエラー画面、保存版コア `/?year=2026&league=pacific` も
2026-10-22T00:50:56ZにCloudflare1102(resource limits)、Ray a4e482bdfb82e394を確認。D1回復だけで表示正常としない。
最終snapshot healthは2026-10-21T09:48:53Z、追加更新が本当に必要かは未確認。更新workflowのdispatchやDB操作はしない。
推奨: 既存公開経路の承認前に1102のroot/新聞表示をread-onlyログとlocal再現で切り分け、当該修復を同じ3lw.1で優先する。
今回の1改善はPR80の保存工程修復に限定。全候補/パのみ/正規採用/登録時刻/lock欠測を保持し、出力前の整合性検査と既存artifact上書き拒否を実装。
新APIは本番未適用のため、本番全対象exportの取得とv2保存版の採用は未達。現在の部分保存版のsource/hash/母集団は変更しない。
別承認の公開適用後、公開exportのschema/hash/母集団をread-backし、生成v2とUIの収録範囲表示を照合する。通常のランキング応答や現在のlockフラグで代用しない。

費用sourceの再確認: OAuth設定metadataは存在するが有効期限切れ、Wrangler whoamiは失敗。専用NPB receipt/admin/ASP設定なし、
関連envキー名・専用config・Cloudflare/Wrangler/A8/NPBのkeychainサービス存在を確認したがread-only接続は成立せず。
GitHub Secret名には既存CF/cron設定があるが値を取得せず、解析・費用へのアクセス証拠としない。
既存の認証回復後にCloudflare解析/請求、ASP確定・取消・返金・手数料のexport、Agent/API/data/infra費を同期間で照合する。
新token作成・権限付与・契約・課金は行わない。profit/first-party funnel/ASPはnullを継続。既存2実験は未判定のまま追加しない。

公開export URLは00:55Zのcurlでも503。未公開PR80のschemaを返したという証拠は取得できず、反復取得は止めた。
Cloudflareブラウザは https://dash.cloudflare.com/login へ遷移し「Cloudflare にサインイン」、A8は https://www.a8.net/ のメディア会員ログイン欄へ遷移。
本人が既存アカウントで通常ログイン（新規登録・権限追加はしない）した後、CFの対象Pages解析/請求画面、A8の対象サイト成果レポートへread-onlyで進む。
入力は既存ログイン情報、操作はCF「ログイン」または既存のログイン方法、A8「メディア会員」の「ログイン」。成功時はログイン欄でなく既存アカウントの管理画面が表示される。
現時点ではどちらも未ログインのため、成果・費用は未確認のまま。新規契約ボタンは押さない。


検証補足: 変更5コードファイルのUBSはexit0/critical0/warning5。JSON.parseはCLIの最上位catchで入力拒否し、fixtureのparseは失敗をtest failureにする。Mapのnonnullは作成直後の同一ID参照で前回から不変。
`ubs .` はJavaScript303秒timeoutでexit2/partial、他言語23ファイルのcritical3は変更前から同一。
内訳はvalidate-data.pyのSQLプレースホルダ個数生成2件（値は別引数でbind）、run-loop.pyの障害signature比較1件（秘密でなく失敗文の一致判定）をsourceで確認。全体PASSとはしない。
standalone tscは変更していない既存scrape-standings-route.test.ts:52のResponse.json unknownで失敗。Next/CF buildと区別する。
公開1102の既存P0はnpb-predictions-arr。現在のroot失敗を同項目と3lw.1に結び、古い原因候補を今回の根本原因と断定しない。


独立レビューの指摘と処置（2026-10-22）: 既存ChatGPT Proで固定commitの1行目/12行を実測と照合後、全6ファイルと周辺sourceを読ませた。
会話: https://chatgpt.com/c/6ad95f8b-16f8-83ec-adc6-4e14c0c49792 （manual CUA経路。モデル/versionはUIで非公開のためnull、表示Proを確認）。
初回blocking1: 不正JSONのSyntaxError.messageが入力の断片をstderrへ出す既存経路。公開exportとseasonsの両入力で短い合成DUMMYを使い、修復前2テストFAILを確認。
最終catchをEEXISTまたはPUBLIC_RESULTS_FREEZE_FAILEDの固定コードに限定した。修復後287unit PASS、既存tsc52以外の型エラーなし。
実値の流出を観測した指摘ではない。修復後2ファイルを同じ会話へ戻して解消確認を依頼し、結果をPRへ反映する。
横展開は保存producerをscripts/web全域で検索し、同じ旧形式の別producerはなし。旧入力経路は同じscript内で置換。v2本番採用と公開1102は引き続き別の未達証拠。

## 2026-10-22 19:45 JST定期実行：再上限と全対象版表示の接続

fresh main / 公開buildは `408cf07`。2026パ保存版209件の確定結果を実ブラウザでread-back。
19:48 JST `/api/cron/feature-health` はimage-gen/commentator-ranking/standings-freshnessで再びD1日次無料row-read上限、news-feedのみhealthy。
この後の同じ失敗の反復は停止。今回のlive release gateはquota確認前に一度起動したが終端出力を回収できず、PASSとして扱わない。全対象exportのprobeは403でデータ取得なし。
次の回復見込みは2026-10-23 UTC 00:00 / JST 09:00。回復時に1回だけhealthを読み、健全なときだけ既存画像API/scoreboardのread-only gateを行う。

PR80は新しいmainを取り込み、v2全対象保存版→結果表示を接続する。実予想ID・元登録日時を維持し、空/不完全な採用行も対象外件数へ含める。
収録の母集団、保存候補数、採用登録数、比較対象数、ロック日時の欠測数を区別し、全登録者/当時lock確認済みとは表示しない。
現行v1の部分保存版データとsource/hashは置換していない。合成v2のローカル表示検証を本番全対象の取得証拠にはしない。
独立reviewの指摘（保存件数と比較件数の名称混同、確定0件時の集計待ち表示）は同じ成果に必要な修正として扱う。

公開に必要な次の材料: PR80の最終head/検証と既存v1のSHA `77558b13bcf7365289510740a195b42ceec2a25c60bd42fe06c3b1114869f8a2` を照合し、オーナーが個別承認した既存PR→main公開経路でAPIを適用する。
その後にread-onlyの `league=all&format=archive` を新規ファイルへ取得し、raw SHA/payload hash/母集団/採用ID/登録日時/lockedAt=nullを確認して新規v2生成物をレビューする。
実データが不足していると確認できた場合だけ、既存日次workflowの一回更新を個別判断する。上限回復だけを完了としない。
本定期実行はmerge/deploy/dispatch/本番DB操作/有料プラン変更を行わない。未判定の実験2件は追加しない。

収益source: 専用設定にreceipt/ASP設定なし、envにもNPB admin bearerなし。Wrangler OAuth metadataは期限切れ、既存 `whoami --json` も未ログイン。
既存Gmailで10/22以降のCloudflare/A8/fancs請求/確定/返金を検索して該当0、接続Driveのnpb名検索も0。不存在/0円の証明ではない。
既存CF/A8の通常ログイン後にread-onlyのanalytics/invoice/ASP確定・取消・返金・手数料exportへ接続し、Agent/API/data/infraの期間配賦を照合する必要がある。
認証/権限の新規付与、契約、案件掲載は未実行。主指標・ASP・流入・共有開始・日別タブはnull、暫定1円目標の達成認定なし。


## 2026-10-23 09:45 JST: D1回復後も保存結果トップのCPU上限を観測

fresh main / 公開buildは408cf07。09:42 JSTの公開healthではD1上限エラーは解消し、image-gen/news-feed/commentator-rankingはhealthy。
standings-freshnessだけが最終snapshot 2026-10-21T09:48:53Zを38時間経過と判定した。シーズン終了後の自動更新停止と整合しないため、これだけを根拠に日次更新を再実行しない。
既存live release gateを一度・各経路1試行で実行し、season画像・新聞画像・通算一覧が503で全体FAIL。scoreboardのHTTP200は内容全体の正しさの保証にしない。
実IABで2026パの保存結果トップがCloudflare1102（2026-10-23T00:43:39Z、Ray a4ecb5737f6bf3d2）。保存コアの正常表示は今回未確認。D1の回復を公開復旧と呼ばない。

PR80の既存laneに、保存結果の年度出典を人物・variantで索引化する修復と、同一scopeの重複集計削減を追加する。順位・出典・ID・母集団を変えないことを3scopeの全JSON一致と入口テストで確認する。
また、最新の各リーグ6球団の完全性・明示final・時刻を検証し、両リーグfinalのときだけ経過時間による警告を免除する。片リーグ欠損・未来・暫定の遅延は免除しない。
ローカルCPU測定は計算部分の改善証拠であり、本番CPUや公開復旧を保証しない。API公開・本番全対象取得・v2採用・公開gateは引き続き未達。

推奨（既定）: 最新PR80の検証結果を材料に、別承認の既存PR→main公開経路で適用後、保存結果の主要導線とlive gateをread-only再確認する。
その後、公開archive応答を新規ファイルへ取得し、source/hash/定義された母集団/正規採用ID/登録時刻/lock=nullを照合する。現在のv1の270/209件とhashは維持する。
代替: 現行公開版を維持する場合は1102の再発と未収録範囲が残る。無料枠拡張・DB直接操作・workflow dispatchは今回実施しない。
更新workflowは本当に最終データ不足が確認された場合だけ個別判断。単なる38時間警告への対応として実行しない。

旧記録の「1改善上限」は10/22のオーナー訂正で失効。今回も1成果に必要な関連修復としてまとめ、未判定2実験は増やさない。
収益sourceは専用receipt/admin/ASP設定なし、Wrangler OAuth metadataは期限切れ。既存CFブラウザはログイン画面、A8は空のログイン欄。
10/22以降の既存GmailのCF/A8/fancs請求・確定・返金関連検索は0件であり、成果/費用0の証拠ではない。
既存通常ログイン後のCF解析/請求・ASP確定/取消/返金/手数料とAgent/API/data/infra配賦のread-only照合が必要。profit・ASP・funnelはnull、暫定1円目標は未達認定を維持する。

検証結果: 325単体/Python6/Next+CF build/データ検証/性能budget/空D1の保存版E2Eが成功。セ・パ・総合の全JSONは旧版と一致。ローカル実IABでパ209件・検索・6行内訳・console警告/エラー0を確認。
独立レビューはClaude週間上限で実行できず、既存ChatGPT Proで固定commitの1/12行を照合してから差分と6ファイル全文・周辺sourceをレビューした。
会話: https://chatgpt.com/c/6adaaf55-d9a0-83ee-8370-65d57d530010 （01-oracleのmanual CUA経路、slug=manual-npb-20261023、実モデル/versionはUI非公開でnull、表示Proを確認）。
初回P2の「5分以内の未来を正常扱い」は、実SQLの60秒先反例FAIL→health専用guardでPASSに修復。final/provisional×now/1秒先/300秒先の6境界も追加し、同一会話の再読でblocking0。reviewerはtest/build/browserを実行していない。
UBS全体は既知wrapper停止のため未達。doctorも6分超で止まり自分の2processだけ終了、feedbackを残した。変更コードの直接JS検査はcritical0/warning0を出したが、最終終了statusは別に確認し、全体検査のPASSへ置き換えない。
