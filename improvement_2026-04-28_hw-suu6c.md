# NPB Predictions — 週次コード改善レポート

> bead: hw-suu6c | company: npb-predictions | date: 2026-04-28

## 現状分析

- **Tech Stack**: Next.js (Edge Runtime) + Drizzle ORM + Cloudflare Pages
- **規模**: 151 ソースファイル
- **SEO**: 37ページ公開済み (目標10 → 370%達成)

## 検出された改善点

| カテゴリ | 件数 | 優先度 |
|---------|------|--------|
| console.log 残存 | 39件 | 高 — 本番コードにデバッグログが漏洩 |
| cache: "no-store" | 10件 | 中 — 静的データにISR推奨 |

## 推奨アクション

1. **console.log 一掃** + ESLint `no-console: warn` ルール追加
2. **キャッシュ戦略最適化** — シーズン/チーム情報に `revalidate` 設定
3. **Lighthouse CI** — パフォーマンス自動計測
