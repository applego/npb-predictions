# npb-predictions — GOAL.md

## Mission

NPB Predictions League MVP リリース — 2026シーズン開幕に間に合わせる

## Key Goals (2026-Q2)

- **KPI 1**: 週次タスク完了数 >= 3件/週
- **KPI 2**: Phase 1 完了（DB schema + seed + 4画面 + スコア計算）
- **KPI 3**: 5人のseedデータ投入完了
- **KPI 4**: SEOページ 10本以上公開

## Autonomous Scope

- **Allowed**: br create, code generation, test execution, documentation updates
- **Requires Approval**: deployment, external API integration
- **Forbidden**: real user data modification, production DB direct access

---

```yaml _machine
version: 2
company: "npb-predictions"
quarter: "2026-Q2"
updated_at: "2026-03-30T00:00:00Z"

kgis:
  - id: kgi_01
    title: "NPB Predictions League MVP リリース"
    metric_type: manual
    target: 1
    current: 0
    unit: "リリース"
    deadline: "2026-04-30"

kpis:
  - id: kpi_01
    title: "週次タスク完了数"
    kgi_ref: kgi_01
    metric_type: br_count
    br_label: "company:npb-predictions"
    br_status: "done"
    current: 0
    target: 3
    unit: "件/週"
    priority: high
    window_days: 7
    lead: true
    controllable: true
    actions:
      - id: act_01
        title: "flywheel による自動タスク dispatch"
        owner: glm
        cadence: daily

  - id: kpi_02
    title: "Phase 1 進捗"
    kgi_ref: kgi_01
    metric_type: manual
    target: 6
    current: 6
    unit: "画面/機能"
    priority: high
    lead: true
    controllable: true

  - id: kpi_03
    title: "SEOページ公開数"
    kgi_ref: kgi_01
    metric_type: manual
    target: 10
    current: 37
    unit: "ページ"
    priority: medium
    lead: true
    controllable: true

kdis:
  - id: kdi_01
    kpi_ref: kpi_01
    title: "日次 dispatch 回数"
    metric_type: event_count
    event_type: "flywheel.task_dispatched"
    daily_target: 1
    unit: "回/日"

  - id: kdi_02
    kpi_ref: kpi_01
    title: "日次 br done 数"
    metric_type: br_count
    br_label: "company:npb-predictions"
    br_status: "done"
    daily_target: 1
    unit: "件/日"

pl_config:
  budget_daily_usd: 5.0
  alert_threshold: 0.8

autonomy:
  tier1_allowed:
    - br_create
    - ms_skill_add
    - goal_progress_update
  tier2_notify:
    - config_update
    - deploy
    - data_source_selection
  tier3_block:
    - external_api_write
    - budget_increase
```
