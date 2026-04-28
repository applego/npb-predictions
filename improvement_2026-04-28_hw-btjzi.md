# 週次タスク完了数 改善計画 (hw-btjzi)

- 日付: 2026-04-28
- 対象KPI: kpi_01 — 週次タスク完了数 (現在 0.0 / 目標 3件/週)
- 前回bead: hw-suu6c (2026-04-27, closed)

---

## 現状アセスメント

| 項目 | 数値 | 評価 |
|------|------|------|
| TS/TSXファイル数 | 151 | 大規模 — 十分な機能実装済み |
| SEOページ数 | 37 (目標10) | ✅ KPI達成済み |
| Phase 1 進捗 | 6/6 | ✅ KPI達成済み |
| テストファイル数 | 13 | 基盤あり、カバレッジ拡張余地あり |
| console.log 残存 | 39件 (seed系20件 + seed-commentators系19件) | プロダクション品質に影響 |
| TODO/FIXME | 1件 (article-generator.ts:60) | LLM統合未実装 |
| revalidate設定 | 4箇所 (600s/3600s) | キャッシュ戦略は一応存在 |

### ボトルネック分析

週次タスク完了数が0の根本原因:
1. **Phase 1完了後の次フェーズが未着手** — 機能は揃ったがUXリデザイン(hw-q9utn)等の大タスクが停滞
2. **小粒タスクへの分解不足** — hw-q9utn, hw-nd473 等は大きすぎて1週間で完了できない
3. **コード品質改善系の quick win が放置** — console.log一掃、テスト追加など即完了可能なタスクが未着手

---

## Top 3 改善提案

### 改善1: console.log 一掃 + ログレベル導入

**概要**: seed.ts (20件) と seed-commentators.ts (19件) の console.log を構造化ログに移行。seedスクリプトはCLI実行専用なので `console.info` に統一し、本番ビルドには影響しない形に整理。

**具体的なbead提案**:
- タイトル: `npb-predictions: seed スクリプト console.log を console.info に統一 + 不要ログ削除`
- ラベル: `company:npb-predictions`, `type:cleanup`
- Done条件:
  - [ ] seed.ts / seed-commentators.ts の console.log → console.info に置換
  - [ ] 実行不要な冗長ログ(重複メッセージ等)を削除
  - [ ] `npm run build` が成功すること
- 見積工数: 30分

### 改善2: revalidate キャッシュ戦略の統一と最適化

**概要**: 現在4箇所でバラバラに設定されている `revalidate` を統一設定として管理。ランキング系ページ(600s=10分)とコメンテーター系(3600s=1時間)は妥当だが、トップページや他のページにはrevalidate未設定。ISR戦略をconstants化。

**具体的なbead提案**:
- タイトル: `npb-predictions: revalidate 設定を constants.ts に集約 + 全ページ適用`
- ラベル: `company:npb-predictions`, `type:optimization`
- Done条件:
  - [ ] `src/lib/constants.ts` (新規) に REVALIDATE_RANKING, REVALIDATE_COMMENTATOR, REVALIDATE_DEFAULT を定義
  - [ ] 既存4箇所のハードコード → constants参照に置換
  - [ ] revalidate未設定のページ(page.tsx等)にデフォルト値を設定
  - [ ] `npm run build` が成功すること
- 見積工数: 45分

### 改善3: article-generator.ts の TODO 解消 (LLM統合スタブ→エラーハンドリング)

**概要**: article-generator.ts:60 の `TODO: Implement when ready to add LLM support` を、LLM未接続時の明示的なフォールバック処理に置き換え。LLM統合自体は別タスクとし、まず「LLM未接続でもクラッシュしない」安全な状態を作る。

**具体的なbead提案**:
- タイトル: `npb-predictions: article-generator TODO解消 — LLM未接続時のフォールバック実装`
- ラベル: `company:npb-predictions`, `type:bugfix`
- Done条件:
  - [ ] TODO コメントを削除
  - [ ] LLM未接続時にテンプレートベースの記事生成にフォールバックする実装
  - [ ] 関連テストを1件以上追加
  - [ ] `npm run build` + テストパスすること
- 見積工数: 1時間

---

## 週次タイムライン

| 日 | タスク | 対応bead |
|----|--------|----------|
| Day 1-2 | 改善1: console.log 一掃 | 新規作成 |
| Day 2-3 | 改善2: revalidate 統一 | 新規作成 |
| Day 3-5 | 改善3: article-generator TODO解消 | 新規作成 |

**合計3件のタスク完了 → KPI目標 3件/週 を達成可能。**

---

## 補足: 大型タスクの分解推奨

以下の停滞中beadは、それぞれ3-5個のサブタスクに分解することでvelocityが上がる:

- **hw-q9utn** (UXリデザイン): テーマCSS、コンポーネント個別移行、ナビ、レスポンシブ、テスト の5分割
- **hw-nd473** (ナビ再設計+Firebase UID): ナビUI、Firebase UID判定、Admin権限、テスト の4分割
- **hw-fisod** (ニュースフィード事実チェック): ソースリンクUI、ファクトチェックAPI、テスト の3分割
