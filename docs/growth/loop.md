# NPB獲得・収益化の実行契約

目標の正本は `GOAL.md`、仕事・担当・待ち条件の正本は `br`、実験定義は
`scripts/growth/experiments.json`。この文書と `status.json` はそれらの投影で、別の進捗台帳ではない。
2026-10-24の修正は `npb-predictions-3lw.3`。本番公開・費用・契約・秘密・権限の承認を増やさない。

## 今何を測るか

最終指標は28日の貢献利益。ASP確定成果、取消/返金、手数料、Agent/API/data/infra費を
同期間で照合する。1円の目標は暫定。未接続・未照合はnull、達成認定をしない。
結果閲覧の日別匿名タブ延べ数、X共有開始、画像保存開始、X由来結果閲覧タブを別々に見る。
人数・再訪人数・X投稿完了は現在の匿名タブ計測から推定できない。
`public_result_routes` はHTTPの補助指標であり、表示内容・共有・利益の成功判定にしない。

## 日次のP→D→C→Adjust

利益経路の比較は `MONETIZATION.md`。各日最初の実行で、配信/物販/現地観戦/広告/有料機能/法人と
共有・再訪の候補を比較し、一次情報の新しい証拠を1つ以上得る。探索は5分程度に収める。
brへ利用者成果、主要な代替案と選択理由、予想する指標変化を記録し、ready仕事へ反映する。
P0の公開障害・私有データの修復は優先するが、契約待ちの1経路だけへ全てを固定しない。
2回目は同日変更の検証・修復を優先する。報告、候補の追加、Graph生成のみを「毎日の変更」としない。
実装不能なら具体的な境界と再開条件を同じtrackerへ戻す。件数合わせの変更はしない。

入口は `scripts/growth/pdca.py daily`。一次計測は1回だけ取得し、同じreceiptを全工程で使う。

1. P: 実験のICEを比較し、公開時刻・公開SHA・観測窓・未判定を照合する。同じ面の未判定実験を増やさない。
2. D: brのready仕事を選ぶ。利益欠測や公開待ちがあっても、別の無料・可逆な関連仕事を止めない。
   Codex automationが選んだ仕事を調査・実装・テスト・独立確認・PRまで実行する。
   このCLIがDを表示しただけでは実装済みにならない。
3. C: 公開証拠が無いprepared実験は未開始、期間中は観測中、期間後にデータが無ければ計測待ち。
   同じ入口の `weekly` は週次の評価材料を出す。採否は事前条件と実sourceを担当Agentが照合する。
   前後比較から因果を断定せず、期日だけで失敗・成功にしない。
4. Adjust: 欠測なら計測経路の修復、ready仕事があればその実行、全て外部待ちならresume triggerを残す。

外部待ちはbrのnotesに機械で読める1行を持つ。
`growth_wait={"kind":"publication","resume":"PR80の別承認公開後にAPI実応答を確認"}`
kindはauth/publication/observation/quota/live_owner。待ちが解消したら担当がsourceを確認してこの行を除く。
これは承認の代わりにならない。担当のある進行中仕事を別Agentが重複実行しないよう、実装前に予約を確認する。

同じ指紋はhistoryへ再追記しない。ただしready仕事が残れば `work_ready` を返す。
無変化だからready仕事まで無視する早期終了を禁止する。全て同じ外部待ちなら `unchanged`。
終了条件は40分・具体的な外部境界・選んだ成果の受入条件であり、1修正やPRの件数ではない。

## Graphとgoal-loop

`pdca.py graph` は同じ一次計測から、結果閲覧→共有/保存→X由来閲覧→ASP→利益の仮説辺を生成する。
全て仮説で、因果・利益を補完しない。goal-treeのつまみは同じ実験台帳から生成し二重定義しない。
`.agents/goal-tree.json` はnative goal-treeの契約。`goal-tree validate --repo <checkout>` で検証する。
native `goal-tree run` と `goal-loop run` はorigin既定branchの契約を読むため、PR内の変更はmain適用まで
その2コマンドの本番契約にはならない。実行source/refを必ず報告し、PRの検証をmain稼働と呼ばない。

定期実行の入口は既存Codex cronの09:45/19:45 JSTだけ。NPBを別のLaunchAgentへ重複登録しない。
cronではgoal-loopの現在地とこのadapterの実PDCAを読む。native loopが利益欠測でheld_measurementでも、
現在の受託Codexはready仕事を実行する。Claudeの利用制限中に同じ失敗を再試行したり、有料APIへ切り替えない。

## 他のClaude Code / Codexへの引継ぎ

ローカルの生receipt/history/graphは `~/.local/state/npb-predictions/growth/`（private）。
`docs/growth/status.json` は秘密・請求値・内部source URL・notesを除いたレビュー済み共有要約。
`pdca.py publish --public-output docs/growth/status.json` は既存のprivate captureから要約だけを作り、再計測しない。
private更新済みでもpublicの指紋が古ければ追従し、同じ指紋なら要約の時刻・commitだけを書き換えない。
意味のある変更時に同じPRへ反映する。GitHubは公開repoなので生ログや外部請求exportを載せない。
既存PRのbranch/commitをどのPCからも取得できるようにし、各Agentは作業前にこの文書と共有要約を読む。

対象Agentへは既存chat/sessionを実在確認して渡し、ファイルのsource_head/fingerprintと
引き受けるtracker IDを返してもらう。送信だけでは受領済みにしない。返答はbrへ記録する。
相手が居ない/利用制限なら未受領を保持し、Agentを勝手に増やさず現在のCodexがready仕事を続ける。
共有要約のhandoff欄は常に未送信を既定とし、実際の配送・受領はbrのsource確認で別に扱う。

停止は既存の `~/.config/npb-predictions/goal-loop.stop`。未変更時の通知・同じ認証探索・上限中のAPI反復はしない。
