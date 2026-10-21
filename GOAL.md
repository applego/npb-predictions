# NPB予想リーグ — 獲得と収益化

## 目標

結果を見に来た野球ファンが、解説者の予想を出典つきで比較し、共有して再訪するサービスにする。
担当はこのrepoのgoal loop。主指標は直近28日の貢献利益。PV・クリック・公開・PRを利益の代用にしない。
旧2026-Q2のリリース件数・タスク完了数の目標は終了し、今後の獲得判断に用いない。

2026-10-21依頼を起点に、2026-11-18までを初回観測期間とする。
黒字化（1円以上）は計画上の暫定の物差し。売上・費用・ASP確定成果を照合できるまで利益はnull。
金額目標のオーナー確定までは達成認定しない。無料の既存CLI・公開情報を使い、有料API・広告出稿は実行しない。
Xは来訪ユーザーが自分のアカウントで共有する。運営投稿・投稿先の指定は今回の対象外。結果カードと文面を用意し、共有開始とX流入を別々に計測する。
契約登録・提携・広告コード公開・支払い・秘密と権限の変更は人間工程。

## 自律範囲

UI・公開データの表示・テスト・PR・公開済み結果の読み取り・投稿案の準備・無料の改善実験を担当する。
今回のデプロイはユーザー依頼済み。将来の無条件の本番公開権限へ拡張しない。
本番DB直接更新、実ユーザーデータ更新、未承認の有料操作を禁止する。
計測の正本はCloudflare/アクセス解析の取得結果、Xの投稿URL/流入、ASPの確定成果と直接費の照合。
運用は scripts/growth/README.md。停止は ~/.config/npb-predictions/goal-loop.stop。

```yaml _machine
version: 3
level: product
entity_id: npb-predictions
parent_ref: null
updated_at: 2026-10-21
target_status: provisional
kgis:
  - id: contribution_profit_28d
    title: 直近28日の貢献利益
    role: outcome
    unit: 円
    source_ref: npb-growth-reconciliation
    aggregation: sum
    window: 28d
    deadline: 2026-11-18
    target:
      op: ">="
      value: 1
    evaluation:
      max_age: 8d
      min_evidence: 1
      review_cadence: weekly
      mode: continuous
    repair: scripts/growth/decisions.md の収益source接続を確認する。欠測を0円にしない。
kpis:
  - id: public_result_routes
    title: 結果導線の公開応答
    role: guardrail
    unit: 経路
    source_ref: public-http
    target:
      op: ">="
      value: 3
    on_breach: notify
    evaluation:
      max_age: 2d
  - id: visitors_28d
    title: 直近28日の利用者
    role: input
    unit: 人
    source_ref: first-party-analytics
  - id: x_visits_28d
    title: X経由の利用者
    role: input
    unit: 人
    source_ref: first-party-analytics-utm
  - id: result_views_28d
    title: 結果閲覧タブの延べ数
    role: input
    unit: 日別タブ
    source_ref: first-party-growth-events
  - id: x_share_starts_28d
    title: X共有開始
    role: input
    unit: 回
    source_ref: first-party-growth-events
  - id: affiliate_confirmed_28d
    title: ASP確定成果
    role: input
    unit: 件
    source_ref: asp-confirmed-export
```
