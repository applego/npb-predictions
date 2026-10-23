# NPB獲得・収益化の共有と受領（2026-10-24 JST）

この記録はrepo-local brの `npb-predictions-3lw.3` の投影。仕事の正本はbr、
実験・目標は既存台帳とGOAL。秘密や生の請求exportは載せない。
実装は [PR #80](https://github.com/applego/npb-predictions/pull/80) のbranchにあり、mainは未反映。

## 利益経路と日次変更の追加確認

`npb-predictions-3lw.4` は利用者が公式の中継案内へ進む修復と、6利益経路を比較して毎日実変更へ進む契約。
候補は配信/放送、書籍/観戦道具、正規チケット/遠征、広告、有料機能、法人/スポンサー。
MONETIZATION.mdが比較の正本で、候補6件を同時実験にはしない。ASP/費用/利益はnull。
既存cronの09:45は比較→実変更、19:45は確認/修復を優先する設定を保存し完全一致でread-backした。
新設定の定時起動・本番反映・利用者成果はまだ未確認。

既存の同じCodexが固定追加source `a68ceeb4f59b23db8657d61a42aeb3e51e8e5fba` を実読し、
source_digestを再計算一致、隔離sourceのPython 23件PASS、追加P0/P1/P2なしと返した。
先のf086667への指摘（古い共有要約、季節限定リンクの明示）は、以下の新captureと
画面の「日本シリーズ2026」表示で対応した。設定済みの広告URLには汎用タイトルを維持する。

追加修復は、自担当in_progressをopenと合わせて再開対象とし、親・他担当の進行中仕事を除外すること、
weeklyがdailyのprivate tracker snapshotと除外条件も再利用すること。
旧open限定・weekly別queryの2反例は回帰テストでFAIL。private snapshotを公開projectionへ出さない。
同じ測定を使うdaily→weeklyはfingerprint一致/changed=falseを実CLIで確認した。

```json
{
  "source_head": "a68ceeb4f59b23db8657d61a42aeb3e51e8e5fba",
  "source_digest": "e30233b1b90656953f53c94f4065ff770e50e9084df6b16bc5054cf57d346c22",
  "fingerprint": "0090e82e96bc08e04822b3ba22c97a6b9efb120942834c6ccf5f3d6538b629e7",
  "selected_tracker_item": "npb-predictions-3lw.2"
}
```

本回の手動選択3lw.4はユーザーの利益経路依頼による。次の自動readyは3lw.2。
3lw.4はPR80の別承認公開後のresourcesと公式案内・戻り導線のread-back待ち。
23件のPython検査はfrontend E2Eや本番反映の証拠に拡張しない。Claudeへの受領も未確認。

## 前のCodexが実際に読んだ証拠

既存チャット「⚾️リーグ結果UIを改善」のCodexへ、既存担当への受領と読み取り専用レビューを依頼した。
新しいchat/Agentは作成していない。受領側は固定head
`e93670ae8475aa3c922756588202217125b2716c` の共有要約を読み、次を返した。

```json
{
  "source_head": "0bcc4ce609cc5b4734664f63d67073ccc185664c",
  "source_digest": "316c0863ccd9b703c481f0999429787ee1d9ed5543e69bc7435ed46ca669d477",
  "fingerprint": "ba66f5927da624a78a4e6f87ffd151332320e90c785193f9cd952f83335734a2",
  "selected_tracker_item": "npb-predictions-3lw.2"
}
```

source_digestは記載source_head・対象headの両方で再計算一致。
隔離した固定sourceのPython 21件成功、既存の3指摘を修復後、追加P0/P1/P2なしとの返答を確認した。
3指摘は「計測失敗でreadyまで停止」「取得時刻だけで差分発生」「private更新後に共有要約が追従しない」。
受領側はレビューだけを行い、次の修復仕事は開始していない。

Claude Codeの稼働中NPB担当・受領は確認できていない。Codexへの配送・実読をClaude Codeへの配送に拡張しない。
共有要約の生成時のhandoff欄は未送信が既定であり、この実受領証拠とは別に扱う。

## 次の実行者と具体的な仕事

担当は既存のNPB Codex automation。次のreadyは `npb-predictions-3lw.2`。
次の定期枠で予約・最新source・既存PRを確認し、以下を同じ修復として扱う。

- `web/src/app/api/seasons/[year]/predictions/route.ts` と
  `web/src/app/api/seasons/[year]/users/[userId]/route.ts` の公開User projectionを明示列に絞る。
- `web/src/app/rankings/commentators/CommentatorRankingsClient.tsx` の全件firebaseUid照合を、
  認証された自己予想取得へ置き換える。単純な列削除だけで自己比較を壊さない。
- 未lock予想・私有識別子の除外と本人の比較を、合成データ・実API入口で反例検証し、独立確認・PRまで進める。

公開の私有値は取得していない。実データの漏洩を確認したという記録ではない。
本番deploy・DB直接操作・権限変更はこの引継ぎで許可しない。

`3lw.1` と `arr` はPR80の別承認公開後のread-back待ち。
APIが公開されたら、定義された全対象のsource/hash・正規採用ID・登録日時・lock欠測と既存gateを確認する。
それまで保存分を全登録者・当時lock確認済みとはしない。

## 稼働と指標の確認範囲

既存Codex cronの09:45/19:45 JST設定を更新・read-backした。日次PDCA・週次評価材料・9指標6仮説辺のgraphは
手動で実行確認した。新設定での次の定時起動はまだ確認していない。
native goal-treeは1ノード検証済み、差分checkのfindingsは0。
native goal-loop/goal-treeのorigin既定branch版は、main適用まで今回のPR契約を読まない。
native loopの主指標は引き続きheld_measurement。これを全ready仕事の停止理由にしない。

利益・ASP・訪問・共有/保存・X由来閲覧はnull。HTTP応答補助は3で、人数・共有実績・利益ではない。
再訪人数・X投稿完了は現在の匿名計測では未計測。1円/28日の目標は暫定のまま。

受領・レビュー・CLI成功は収益化の達成でも、main/本番反映でもない。
