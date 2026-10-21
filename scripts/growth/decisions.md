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
