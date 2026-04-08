# NPB Predictions — デプロイチェックリスト (4月末MVP締切)

> **作成**: 2026-04-02 ref:hw-mdylk
> **締切**: 2026-04-30
> **デプロイ先**: Cloudflare Pages + D1

---

## Phase 1 進捗確認

| 機能 | ステータス | 確認方法 |
|------|-----------|---------|
| DBスキーマ (D1 SQLite) | ✅ DONE | `drizzle/0000_steady_phantom_reporter.sql` |
| シードデータ (29ユーザー+予想) | ✅ DONE | `src/db/seed-commentators.sql` |
| スコア計算エンジン | ✅ DONE | `src/lib/scoring.ts` + 18テスト全通過 |
| 管理API (standings/titles/recalc) | ✅ DONE | `src/app/api/admin/` 全ルート実装済 |
| SEOページ (37本) | ✅ DONE | `src/app/seo/` (目標10本 → 超過達成) |
| シェア機能 (OGP) | ✅ DONE | `src/app/api/og/[type]/route.tsx` |

**→ KPI 02 (Phase 1): current=6 / target=6 ✅ 完了**

---

## シードデータ投入確認

### D1への投入方法（重要: seed.ts は使わない）

> ⚠️ `src/db/seed.ts` は Neon Postgres 向けで **D1 では動作しない**。
> D1 への投入は必ず `wrangler d1 execute` + SQLファイルを使う。

```bash
# 1. ローカル D1 に投入（動作確認用）
cd companies/npb-predictions/web
wrangler d1 execute npb-predictions --local --file=src/db/seed-commentators.sql

# 2. 本番 D1 に投入（デプロイ後）
wrangler d1 execute npb-predictions --file=src/db/seed-commentators.sql

# 3. 投入確認
wrangler d1 execute npb-predictions --command="SELECT COUNT(*) as users FROM users"
wrangler d1 execute npb-predictions --command="SELECT COUNT(*) as predictions FROM predictions"
```

### 期待値

| テーブル | 期待レコード数 |
|---------|--------------|
| users | 29 (5コアメンバー + 24コメンテーター) |
| seasons | 1 (2026シーズン) |
| predictions | 29 (全ユーザー × 2026) |
| ranking_picks | 29 × 12 = 348 |
| title_picks | 5 × 12 = 60 (コアメンバーのみ) |

---

## デプロイチェックリスト

### 前提条件

- [ ] `wrangler` ログイン済み (`wrangler whoami` で確認)
- [ ] D1 データベース作成済み (database_id: `39af9cc0-90d6-46fe-81cc-c8e31d7c3a66`)
- [ ] Cloudflare Pages プロジェクト作成済み (name: `npb-predictions`)

### Step 1: 環境変数の設定

```bash
# .env.local に設定不要（D1はwrangler経由）
# Cloudflare Pages の環境変数ダッシュボードで設定:
# CLOUDFLARE_ACCOUNT_ID=<your_account_id>
# ※ D1はwrangler.tomlのbindingで自動注入
```

### Step 2: DBマイグレーション

```bash
cd companies/npb-predictions/web

# D1にスキーマを適用
wrangler d1 execute npb-predictions --file=drizzle/0000_steady_phantom_reporter.sql

# または drizzle-kit migrate (D1-HTTP経由)
# 必要環境変数:
# CLOUDFLARE_ACCOUNT_ID=xxx
# CLOUDFLARE_D1_DATABASE_ID=39af9cc0-90d6-46fe-81cc-c8e31d7c3a66
# CLOUDFLARE_D1_TOKEN=xxx
npm run db:migrate
```

### Step 3: シードデータ投入

```bash
# 本番D1にシードデータ投入
wrangler d1 execute npb-predictions --file=src/db/seed-commentators.sql

# 確認クエリ
wrangler d1 execute npb-predictions \
  --command="SELECT u.slug, COUNT(p.id) as preds FROM users u LEFT JOIN predictions p ON p.user_id=u.id GROUP BY u.slug"
```

### Step 4: ビルド & デプロイ

```bash
cd companies/npb-predictions/web

# テスト通過確認
npm test
# 期待: 18 passed

# Cloudflare Pages ビルド
npm run build:cf
# 生成先: .vercel/output/static

# デプロイ
npm run deploy:cf
# または: wrangler pages deploy
```

### Step 5: デプロイ後スモークテスト

```bash
# 本番URLを確認（例）
PROD_URL="https://npb-predictions.pages.dev"

# ヘルスチェック
curl -s "$PROD_URL/api/seasons" | jq '.[0].year'
# → 2026

# ユーザー一覧
curl -s "$PROD_URL/api/users" | jq 'length'
# → 29

# スコアボード
curl -s "$PROD_URL/api/seasons/2026/current-scoreboard" | jq '.users | length'
# → 29

# SEOページ
curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/seo/2026/central/final-standings"
# → 200
```

---

## クリティカルパス（4月末まで）

```
今日 (04-02)
  │
  ├─ [DONE] Phase 1 全機能実装 ✅
  ├─ [TODAY] デプロイチェックリスト作成 (hw-mdylk)
  │
  ├─ [Week 14] DBマイグレーション + シード投入
  │     └─ wrangler d1 execute + 確認クエリ
  │
  ├─ [Week 14-15] 本番デプロイ
  │     └─ npm run deploy:cf
  │
  ├─ [Week 15] スモークテスト + 5人メンバーへ招待URL送付
  │
  └─ [04-30] MVP締切 ← KGI達成
```

## 残タスク (GOAL.md kgi_01 達成のため)

| 優先度 | タスク | ブロッカー |
|--------|--------|----------|
| 🔴 P0 | D1マイグレーション実行 + シード投入 | Cloudflare credentialsが必要 |
| 🔴 P0 | Cloudflare Pages 本番デプロイ | - |
| 🟡 P1 | スモークテスト + 5人招待 | デプロイ完了後 |
| 🟢 P2 | GOAL.md kgi_01.current を 1 に更新 | デプロイ完了後 |

---

## 注意事項

### seed.ts について

`src/db/seed.ts` はローカル開発時の Neon Postgres 用に書かれており、
**本番 D1 へのシード投入には使用しない**。
本番用シードは `seed-commentators.sql` (SQLite SQL) を使う。

### drizzle.config.ts の環境変数

```bash
# drizzle-kit migrate を使う場合に必要
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export CLOUDFLARE_D1_DATABASE_ID=39af9cc0-90d6-46fe-81cc-c8e31d7c3a66
export CLOUDFLARE_D1_TOKEN=your_d1_api_token  # Cloudflare API Token
```

### Cloudflare Pages の edge runtime

全APIルートに `export const runtime = "edge";` が必要。
現在の実装は確認済み。

---

_作成: hw-mdylk / PearlAnchor (Sonnet 4.6)_
