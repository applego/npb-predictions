# NPB予想リーグ — 獲得と収益化

## 目標（KGI）

解説者の順位予想を出典つきで網羅し、シーズン後に採点した答え合わせで検索から人を集め、
観戦・視聴の意図に合う紹介で利益を出す。主指標は直近28日の貢献利益（確定売上−返金−手数料−直接費）。
PV・クリック・公開・PR・仕事の数を利益の代用にしない。

- **KGI: 2027-10-31 までに、直近28日の貢献利益 ≥ 10,000円**（暫定。オーナー確定までは達成認定しない）。
  年間で約10万円の水準。`scripts/growth/profit_sim.py` の試算では、今の来訪（月300人と仮定）のままなら年約3,600円で、
  来訪をおよそ30倍（月1万人）にし、配信・放送の新規契約紹介（A8.net スカパー! 1件3,620円）を開幕前に置くことが前提。
- 2026-11-18 までの初回観測期間で決めた「28日で1円以上」は、収益sourceが無いまま判定不能になったので、この期限つきの目標へ置き換える（2026-11-01）。
- 売上・費用・ASP確定成果を照合できるまで利益はnull。欠測を0円にしない。

## KPIツリー（KGIを動かす要因）と節目

利益 = 来訪 × 紹介リンクのクリック率 × 成約率 × 単価 − 費用。来訪の主経路は検索（解説者名・「順位予想 答え合わせ」）。

| 段 | 指標（GOALの id） | 今の値（2026-11-01） | 節目 | 計測 |
|---|---|---|---|---|
| 来訪 | `search_clicks_28d` 検索からのクリック | 未計測（Search Console未確認） | 2027-01-31に300、2027-03-31に3,000 | Search Console（オーナーの所有権確認待ち） |
| 来訪 | `result_views_28d` 結果閲覧の日別タブ | 10 | 2027-03-31に3,000 | D1 growth_events（自動、読み取りのみ） |
| 行動 | `affiliate_clicks_28d` 紹介リンクのクリック | 0 | 2027-04-30に100 | D1 affiliate_clicks（自動） |
| 成果 | `affiliate_confirmed_28d` ASP確定成果 | 未計測（ASP未登録） | 2027-05-31に3件 | ASPの確定成果export（オーナーの登録待ち） |
| 共有 | `x_share_starts_28d` / `x_result_tabs_28d` | 0 / 0 | 補助。採否の判断材料 | D1（自動） |

## 自分で動かす行動（KDI）

- 毎週1件以上、1変数の実験を公開する（公開SHAと時刻を `scripts/growth/experiments.json` に記録）。数えるのは公開した実験で、PRの数ではない。
- 2027年の解説者の順位予想は、発表から24時間以内に出典つきで載せる（2〜3月が検索の山）。
- 2026年の確定結果で、解説者ごとの答え合わせページを作り、検索に載る形（最初のHTMLに名前と点数）にする。

KDIを達成してもKGIの達成にしない。KPIが動かなければ、同じ行動を増やす前に仮説・計画を見直す。

## 回し方（鬼速PDCA）

- 毎日: `python3 scripts/growth/pdca.py daily` が計測（`measure.py` が D1 を読み取り専用で集計）→ 実験の並べ替え → 次の一手を出す。欠測は欠測のまま記録する。
- 毎週月曜: `weekly` で観測期間の終わった実験を、事前に決めた判定条件で採否を決め、採用は決まりへ反映する。
- 毎月1日: KPIの節目と比べ、行動不足・量/質不足・想定外の課題・因果仮説の誤りに切り分けて計画を直す。目標値の見直しはオーナーへ提案する。
- 先の予定・見直し日は、文書だけに書かず bead（defer/due）にする。

## 自律範囲

UI・公開データの表示・テスト・PR・公開済み結果の読み取り・無料の改善実験を担当する。
本番DB直接更新、実ユーザーデータ更新、未承認の有料操作を禁止する。
契約登録・提携・広告コード公開・支払い・秘密と権限の変更・本番への統合は人間工程（`scripts/growth/decisions.md`）。
Xは来訪ユーザーが自分のアカウントで共有する。運営投稿は対象外。
運用は scripts/growth/README.md。停止は ~/.config/npb-predictions/goal-loop.stop。

```yaml _machine
version: 3
level: product
entity_id: npb-predictions
parent_ref: null
updated_at: 2026-11-01
target_status: provisional
kgis:
  - id: contribution_profit_28d
    title: 直近28日の貢献利益
    role: outcome
    unit: 円
    source_ref: npb-growth-reconciliation
    aggregation: sum
    window: 28d
    due: 2027-10-31
    target:
      op: ">="
      value: 10000
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
  - id: search_clicks_28d
    title: 検索からのクリック
    role: input
    unit: 回
    source_ref: search-console
    repair: Search Console の所有権確認（オーナー操作、scripts/growth/decisions.md の2）
  - id: result_views_28d
    title: 結果閲覧タブの延べ数
    role: input
    unit: 日別タブ
    source_ref: first-party-growth-events
  - id: affiliate_clicks_28d
    title: 紹介リンクのクリック
    role: input
    unit: 回
    source_ref: first-party-affiliate-clicks
  - id: affiliate_confirmed_28d
    title: ASP確定成果
    role: input
    unit: 件
    source_ref: asp-confirmed-export
    repair: A8.net 登録とスカパー!提携（オーナー操作、scripts/growth/decisions.md の1）
  - id: x_share_starts_28d
    title: X共有開始
    role: input
    unit: 回
    source_ref: first-party-growth-events
  - id: x_result_tabs_28d
    title: X由来の結果閲覧タブ延べ数
    role: input
    unit: 日別タブ
    source_ref: first-party-growth-events-utm
  - id: card_downloads_28d
    title: 結果カード保存開始
    role: input
    unit: 回
    source_ref: first-party-growth-events
  - id: weekly_experiments_published
    title: 公開した1変数実験（週）
    role: input
    kind: action
    unit: 件
    source_ref: scripts/growth/experiments.json
```
