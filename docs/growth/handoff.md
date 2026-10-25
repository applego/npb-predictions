# NPB獲得・収益化の引継ぎ（2026-10-24）

仕事・担当・待ち条件の正本はrepo-local br。本書は固定sourceの投影。
到達は2/4: PR。本番main 408cf075033852911137bd672e7e1a0d85f052cbは未変更。
本automationはmerge/deploy・外部投稿・契約・有料API・権限/秘密変更・本番DB操作を行っていない。

## 現在の固定sourceとcapture

- product source: e2f7626a24cbefbd5d2a053fa2b9596659018795
- privacy修復source（上記の祖先）: f5ea3e23c9f14060bb8e0f3fd01756525dd2b9e4
- PR: https://github.com/applego/npb-predictions/pull/80
- 今回tracker: npb-predictions-3lw.5 / owner: npb-automation
- status source_head: e2f7626a24cbefbd5d2a053fa2b9596659018795
- source_digest: e30233b1b90656953f53c94f4065ff770e50e9084df6b16bc5054cf57d346c22
- fingerprint: e2014e547114b9cedb23db676e1e2f388deb2aa9e422e442c76a09d745d4f819

mainに新入口が無いため既存bootstrap laneを再利用。origin/branch/9dddab1祖先と実行sourceのcommitted HEAD一致を確認した。
main適用後はmain由来の実行場へ移しbootstrap依存を外す。既存rootのdirtyは吸収していない。
10:43:29Zの一次計測1回→同stateのweekly→graphを実行。修復後のtracker変化はそのmetricsを再利用しpublishした。
source_digestは契約の指紋であり全product codeのhashではない。実体はproduct sourceを参照する。
source_headはその再評価の実行source、observed_atは再評価時刻であり公開・新規計測の時刻ではない。

## 今回の利用者成果（3lw.5）

比較中の年度がスマホでも見え、選択中の操作を読め、1人の予想も文字切れのないPNGにできる。
昇順14年度の横scrollをlabel付き年度選択へ置換。activeはthemeのprimary文字・枠・aria-pressedで区別する。
CSS変数へhex alphaを連結する無効な指定をcolor-mixへ修復。関連するPNG/分布操作の淡色文字にも適用した。
年度/リーグ変更は前の取得を中断し、古い応答・error/finallyで現在の結果を上書きしない。
新聞PNGは1列でも最小幅360pxと中央gridを持ち、タイトル・リーグ・作成日・footerを読める。
観測する変化は比較/保存開始やその後の流入であり、利用者・保存完了・利益への効果は未確認。

同日初回の6利益経路比較と公式一次証拠を再利用し、今回は前回の目視残差を優先した。
視聴案内は3lw.4で修復済みの公開待ち。物販/遠征は需要・案件条件未確認、広告/有料/法人は需要と承認が不足する。
新しい未判定実験は追加していない。prepared 2件は公開時刻/SHA・比較条件・同期間データが揃うまで判定しない。

## 検証と独立受領

固定sourceで型/Next+CF build/333単体テストPASS。実Chromiumで新比較3幅と既存privacy2件の5件PASS。
320/390/1400pxで年度変更→当該年度API/表示→選択状態contrast 4.5以上→PNG操作→実PNGを確認。
実canvasに描いたタイトル/footerの範囲と同じ行のリーグ/日付の非重複も確認。横overflow 0、console/pageerror 0。
本人比較は合成Firebase/レスポンス境界で連携待ち→認証付き本人GET→503/404区別→マイページを確認。本番ログインの証明ではない。
旧年度UIでは3幅FAIL、旧PNGでは描画文字の範囲がcanvas幅を超えてFAIL。
abort cleanupを外したbuilt mutantでは逆順の2025応答で2026表示が失われてFAIL。固定sourceへ復元し再build/5件再検証もPASS。
初期fixtureのlikes未定義によるconsole 500と、build同時実行による不適切なrace予備検証は失敗として保持し、反例成功に数えない。

既存チャット「⚾️リーグ結果UIを改善」のCodexがe2f7626の5file差分と合成画像7枚を実読し、今回scopeにblocking 0と回答。
年度・操作・今回の1列PNGに限るDesigner Gateであり、サイト全体の品質や本番反映の判定ではない。
同Codexの受領はtracker npb-predictions-3lw.5/read-only review。編集・merge・deployを頼んでいない。
同Codexはstatus実ファイルを読み、source_head e2f7626a24cbefbd5d2a053fa2b9596659018795、
source_digest e30233b1b90656953f53c94f4065ff770e50e9084df6b16bc5054cf57d346c22、
fingerprint e2014e547114b9cedb23db676e1e2f388deb2aa9e422e442c76a09d745d4f819、selected=null/work_required=falseを返した。
2026-10-24T10:55:47Zにtracker3lw.5/read-only reviewの受領を確認。次owner=npb-automation、別承認公開後read-back。
送信を受領とは扱っていない。Claude Code担当の現在の実在/受領は未確認、既知の利用制限は再試行していない。
Agent/chatの新設は行っていない。

変更3fileのUBSはexit 0/critical 0/warning 122。主に既存hooks検出等でありwarningを0件とはしない。
全体UBSは既知のtool停止で未達を維持し、部分検査を全体PASSとしない。必須CIはPR最新headのcheckを正本とする。
前回privacy APIの実SQL/auth検証と独立指摘の修復はf5ea3e2に保持し、今回の変更で同じブラウザ入口を回帰確認した。

## 次ownerとresume

owner=npb-automation。3lw.5/3lw.2/3lw.1/arr/3lw.4は別承認によるPR80公開後のread-back待ち。
最新CI失敗は先に同sourceで修復する。この定期実行から本番merge/deployをしない。
3lw.5: 実公開の320/390/1400pxで年度/リーグとデータ一致、本人比較、PNGタイトル/日付/footerを確認する。
3lw.2: 公開2APIの列/未lock404と本人比較・マイページを実環境で確認する。
3lw.1/arr: healthを次の回復条件で1回読み、健全なときだけ既存live gateをread-only実行する。
今回の正しいhealth経路はHTTP200でも3sourceがD1 quotaのまま。画像/scoreboard/export/gateの同じ失敗を再試行していない。
全対象archive/hash/母集団/正規variant/登録時刻/lock欠測の実取得・照合は未達。
3lw.4: 公式中継案内と戻り導線を公開実体で確認する。

利益・ASP確定成果・費用照合・共有/流入指標はnull。1円/28日はオーナー未確定の暫定値。
HTTPの3経路応答をsemantic health・人数・利益に読み替えない。収益認証待ちは設定/セッションの変化まで再探索しない。


## 2026-10-25: main移行と共有由来・日別タブ計測（npb-predictions-3lw.6）

PR80はmain `e7cfe6e2bc86b0d5b896f8d393bd8584a658496d` に統合済み。
この回の実行場はmain由来の `fix/growth-final-season-20261025`。旧bootstrap依存を外した。
本番 `/api/build-info` は `408cf075033852911137bd672e7e1a0d85f052cb`。
デザイン合意待ちで公開run40109419828はcancel、main統合を公開済みと扱わない。
このautomationはmerge/deploy/DB直接操作/外部投稿/契約/有料APIを実行していない。

実行入口はcommitted mainとbyte一致を確認。native dry-runはheld_measurement。
一次計測は2026-10-25T00:47:55Zのdaily1回、weekly/graphは同captureを再利用。
tracker変更後の再評価も同metricsを明示入力し、外部計測し直していない。
利益・funnel・ASP確定成果・費用照合はnull。2実験はprepared/公開証拠待ちのまま。
1円目標は暫定で、HTTP3経路やPRを達成としない。

新しい一次情報は[U-NEXT公式告知](https://help.unext.jp/info-video/detail/info166c)。
日本シリーズの対象は5試合、追いかけ再生非対応、10月25日17:45配信開始という条件を確認した。
需要実績・提携・単価の証拠ではない。視聴の公式案内はPR80で修復済みだが公開待ち。
物販/チケットは需要・条件、広告/有料/法人は需要・承認が未確認。
未合意のデザインに重ねず、共有と再訪の既知の計測誤りを今回の修復に選んだ。

### 修復と証拠

製品source `fac7d3d710800e1ee6101cfba47dccc7ae71c8ed`。日付のないview重複抑止をUTC日別へ直し、
同じタブ内のX由来をsessionStorageに保持。内部移動後にも維持し、タブを跨ぐ識別は増やさない。
APIにscope横断の `dailyTotals` を追加し、同日・同タブが複数リーグ/年度/sourceに現れても重複を除く。
日付窓は当日を含む28UTC日で未来日を除外。旧reportから復元不能なタブ合計はnull。
共有/保存開始の回数を人数・X投稿完了・OS保存完了へ読み替えない。
過去の翌日未送信分は復元できず、公開後からの修復となる。

全340unit/Python25/tsc/Next build/CF再build PASS。
旧client/API/measureの各実装では対応した新テストがFAILし、修正版へ戻してPASS。
CF初回のfont取得TypeError、未生成WorkerでのE2E起動timeout、local D1 namespace差による
fixture未投入の0件表示は失敗として保持。CI同schema/seedを自分のlocal D1へ投入し、
実ChromiumのX閲覧→内部リーグ移動→UTC翌日再訪→同日再読込抑止を確認した。
未公開APIの本番応答を読んだ証拠ではない。

変更製品3fileのUBSはexit0/critical0/warning3（Python2/JS1）。
全体UBSは今回完走しexit1/critical18/warning977でPASSではない。
既存auth/query/OG/validation/旧loopのtracked8fileはfresh mainと同一。
生成support.jsと誤検知を含むため18件を実脆弱性数としない。親3lwへ発見・次のsecurity review機会を記録。

### 独立実読・受領

既存Codexチャット「⚾️リーグ結果UIを改善」が固定sourceの8file差分を実読しblocking0、
TS5/Python25を別途再実行してPASS。担当はnpb-predictions-3lw.6のread-only review。
実ファイルのsource_head `fac7d3d710800e1ee6101cfba47dccc7ae71c8ed`、source_digest `27a9e7d4f1420cc9a029fd43b849731234f37ac3520a4f3a0d10cee2e29648ff`、
fingerprint `064408e4c3fe571b1b64f161e86130cf3438a12c5b3f95c97e1795ef2ea2bad0`、selected_tracker_item=npb-predictions-3lw.6の4値一致を返した。
送信を受領と扱わず実返答を確認。Claude Codeの現在の実在/受領は未確認、既知の認証/利用制限を再試行しない。
全340unit・CF/E2Eを独立者自身が再実行したとは主張しない。正確なprovider/model versionはnull。

次owner=npb-automation。CI/PRの終端証拠を確認し、別承認の公開後に本番の同導線と
admin aggregate/UTC日別集計をread-backする。公開は既存チャットのデザイン合意待ちを維持。
3lw.1/arr/.2/.4/.5はruntime公開待ち、.3はmain新契約と本09:45実行を確認済みだがruntime未達。
health1回でD1上限は回復、image-gen/news/commentatorはhealthy。ただし順位86h staleのため
全健全とせずlive release gate/archive取得は行っていない。mainのfinal鮮度修復は既存のまま追加しない。

最終captureは3lw.6を公開待ちに戻した同metrics再評価。source_head/digestは上記のまま、
fingerprint `b6ce123cf074d3d27af892150af741a0554e878de697217f1e7b14a2567a550f`、selected=null/work_required=false。
既存Codexは2026-10-25T00:58:04Zに最終実ファイルの4値とselected=null/work=falseを返し、
npb-predictions-3lw.6/read-only担当として受領した。上の0644途中受領と区別する。
実Chromiumの最終追加assertionでconsole/pageerror0もPASS。

push前data gateは、E2E専用の合成人物を入れたlocal DBのsource coverage 3/27で一度FAIL。
CIと同じ順序に分け、checked-in migrations+SQL production seedだけから別のpristine local DBを生成し、
既存NPB_VALIDATE_DB_PATHでそのDBを指定してpre-pushを再実行、ALL CHECKS PASSED/98 slug coverageを確認。
E2E fixtureは独立した自分のlocal DBに保持し、gateの閾値・実装を変更したりskipしていない。
