# AGENTS.md — npb-predictions

> **このファイルは各 institution の AGENTS.md テンプレートです。**
> `npb-predictions` を会社名に置換して使う。
> GOAL/KGI/KPI/KDI はすべて `GOAL.md` を Single Source of Truth とし、ここには書かない。

---

## 1. ミッション & 目標 → GOAL.md を読む

```bash
cat ./GOAL.md
```

- **KGI** (遅行指標・北極星): GOAL.md の `kgis:` セクション
- **KPI** (先行指標・週次): GOAL.md の `kpis:` セクション
- **KDI** (日次行動指標): GOAL.md の `kdis:` セクション
- **自律スコープ**: GOAL.md の `autonomy:` セクション — tier1/2/3 の境界を必ず確認

---

## 2. 自分のタスクを取る

```bash
# このcompanyのopen beadを取る
br list --label "company:npb-predictions" --status open

# 優先度付きで取る（推奨）
bv --robot-triage --filter "company:npb-predictions" --json | head -5

# タスクを着手状態にする
br update <TASK_ID> --status in_progress
```

---

## 3. レイヤー別ロール

| Layer | ロール | 主な作業 | 使う Executor |
|-------|--------|----------|--------------|
| L1 | architect | GOAL.md更新, KPI設計, 戦略決定 | claude_opus |
| L2 | implementer | 機能実装, リファクタ, テスト | gemini / claude_code |
| L3 | executor | SNS投稿, コンテンツ生成, 日次タスク | gemini-flash |

自分のタスクの `role:` ラベルを確認してから作業する:
```bash
br show <TASK_ID>  # labels に role:architect / role:implementer 等
```

---

## 4. 完了条件（全タスク共通）

```bash
# 1. テスト / UBS チェック
ubs <changed_files>

# 2. コミット
git add <files> && git commit -m "feat(npb-predictions): 変更内容 ref:TASK_ID"

# 3. タスク完了
br close <TASK_ID>

# 4. スキルフィードバック
ms feedback add <used_skill_id> --positive --comment "type:feature 理由:..."

# 5. push
git push
```

---

## 5. エスカレーション

| 状況 | アクション |
|------|-----------|
| KPI が3サイクル停滞 | br create "🚨 KPI stagnant: npb-predictions" --label "escalation:kpi_stagnant" |
| GOAL.md の数値を更新したい | `autonomy.tier1_allowed` に `goal_progress_update` があれば自律実行 OK |
| API/外部サービス連携を追加 | `autonomy.tier2_notify` → agent mail でユーザーに通知してから実行 |
| 予算増加・会社の追加/削除 | `autonomy.tier3_block` → **必ずユーザーに確認** |

---

## 6. 参照ファイル一覧

```
companies/npb-predictions/
├── GOAL.md          ← KGI/KPI/KDI/P&L/autonomy の SSOT
├── AGENTS.md        ← このファイル（プロトコル）
└── ...              ← 実装ファイル

_state/
├── executor-config.yaml   ← executor ルーティング設定
└── events/                ← flywheel イベントログ

_state/reports/
└── flash-latest.json      ← KPI フラッシュレポート（最新）
```

---

_このテンプレートを使う場合は `npb-predictions` を実際の会社名に置換し、不要なセクションを削除すること。_
