# ARCHITECTURE — NPB Predictions

> Last updated: 2026-05-28
> Living document. Code/runtime が真実、これは俯瞰図。乖離見つけたら即更新。

---

## 0. TL;DR (1 画面で全体)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      USER (Browser / Mobile)                          │
│                              ↓ HTTPS                                  │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Cloudflare Pages: npb-predictions.pages.dev (main / production)  │ │
│ │ Cloudflare Pages: dev.npb-predictions.pages.dev (dev preview)    │ │
│ │   ↑ wrangler pages deploy (GH Actions or manual)                 │ │
│ │   • Next.js 15 (App Router) → @cloudflare/next-on-pages          │ │
│ │   • Edge runtime workers (satori for OG, drizzle for D1)         │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│        ↓ binding env.DB        ↓ external fetch     ↓ Firebase SDK   │
│ ┌──────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│ │ Cloudflare D1    │  │ npb.jp / jsdelivr   │  │ Firebase Auth    │ │
│ │ (SQLite at edge) │  │ (scraping / fonts)  │  │ Google Sign-In   │ │
│ │ npb-predictions  │  │                     │  │ project:         │ │
│ │ id 39af9cc0-...  │  │                     │  │ npb-predictions- │ │
│ │                  │  │                     │  │ league           │ │
│ └──────────────────┘  └─────────────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
   ↑
   wrangler d1 execute --remote                          GitHub Actions
   wrangler d1 execute --local (miniflare)               • build/test/E2E
                                                         • CF Pages deploy
                                                         • daily cron (Phase 2 予定)
```

---

## 1. Stack 一覧

| 層 | 技術 | 備考 |
|---|---|---|
| Framework | Next.js 15 (App Router) | TypeScript |
| Runtime | Cloudflare Workers (Edge) | `@cloudflare/next-on-pages` で変換 |
| DB | Cloudflare D1 (SQLite at edge) | binding `DB`, drizzle-orm |
| Auth | Firebase Auth (Google Sign-In のみ) | project `npb-predictions-league` |
| Hosting | Cloudflare Pages | project `npb-predictions` |
| OG画像 | next/og (satori) | woff font (jsdelivr) |
| Style | Tailwind v4 + design tokens (web/src/app/globals.css) | DESIGN.md 参照 |
| DnD | @dnd-kit/{core,sortable,utilities} | 順位予想 UI |
| Test (unit) | vitest | `npm test` |
| Test (E2E) | Playwright | `npm run test:e2e` (CI で deploy 前 gating) |
| CI | GitHub Actions ubuntu-latest | `.github/workflows/npb-predictions-ci.yml` |

---

## 2. データベース (Cloudflare D1)

### 2.1 接続情報

| 項目 | 値 |
|---|---|
| **database_name** | `npb-predictions` |
| **database_id** | `39af9cc0-90d6-46fe-81cc-c8e31d7c3a66` |
| **account** | applegorillappa@gmail.com (`68852a9ea8d4375873c548608a7ac2bd`) |
| **binding (Worker)** | `DB` (`env.DB`) |
| **wrangler.toml** | `web/wrangler.toml` |
| **dashboard** | https://dash.cloudflare.com/68852a9ea8d4375873c548608a7ac2bd/workers/d1/databases/39af9cc0-90d6-46fe-81cc-c8e31d7c3a66 |
| **local emulator** | `web/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` |

### 2.2 主要テーブル (schema 真実: `web/src/db/schema.ts`)

| Table | 内容 |
|---|---|
| `users` | アプリユーザ (`firebaseUid` 紐付き) + 解説者・友達 (firebaseUid なしの過去人物) |
| `seasons` | NPB シーズン (年単位、`isActive` で「今シーズン」識別) |
| `predictions` | ユーザの 1 シーズン分の予想 (variant 別) |
| `ranking_picks` | 各 prediction の順位 picks (league × rank × team_name) |
| `title_picks` | 各 prediction のタイトル予想 picks (category × player_name × team_name) |
| `actual_team_standings` | npb.jp scraper が取得する 実際の順位 (scoring に使う) |
| `game_results` | 試合結果 (scoreboard / 雑誌生成) |
| `score_snapshots` | 日次計算スコア (`rank`, `total_score`) |
| `awards` | 各賞 (first_half_champion etc) |
| `likes` | 匿名 like (fingerprint ベース) |
| `scrape_failure_events` | scrape 失敗履歴 (alert 用) |
| **`players`** ← 2026-05-27 追加 | NPB 12 球団 選手リスト (タイトル予想 combobox 用) |

### 2.3 Migrations (drizzle/*.sql)

| Migration | 内容 |
|---|---|
| 0000-0005 | core schema 構築 + security hardening |
| 0006 | normalize team names (shortName → fullName) |
| **0007** ← 2026-05-27 | players table + indexes |

### 2.4 操作コマンド (web/ で実行)

```bash
# 本番 D1 直接クエリ
npx wrangler d1 execute npb-predictions --remote --command "SELECT COUNT(*) FROM players"

# ローカル D1 (miniflare) 直接クエリ
npx wrangler d1 execute npb-predictions --local --command "SELECT COUNT(*) FROM players"

# Migration 適用 (本番)
npx wrangler d1 execute npb-predictions --remote --file=drizzle/0007_npb_players.sql

# Seed 投入
npx wrangler d1 execute npb-predictions --remote --file=src/db/seed-players.sql
```

### 2.5 Seed ファイル
- `src/db/seed-commentators.sql` — 解説者 457 名 + predictions
- `src/db/seed-players.sql` — NPB 12 球団 × 5 主力 = 60 名 (Phase 0)
  - Phase 2 で daily scraper が全 ~840 名追従予定

---

## 3. API endpoints (Edge runtime)

| Path | Method | 用途 |
|---|---|---|
| `/api/seasons` | GET | シーズン一覧 |
| `/api/seasons/:year/predictions` | GET | 予想一覧 |
| `/api/seasons/:year/current-scoreboard` | GET | リアルタイムスコア |
| `/api/predictions` | POST | 予想登録 |
| `/api/predictions/:id` | PATCH | 予想更新 |
| `/api/predictions/:id/lock` | POST | 予想ロック |
| **`/api/players?team=&q=&limit=`** ← 2026-05-27 追加 | GET | 選手検索 (combobox) |
| `/api/users` | GET | ユーザ一覧 |
| `/api/users/:id/history` | GET | スコア履歴 |
| `/api/likes/:userId` | GET / POST | like 取得/付与 |
| `/api/og/[type]` | GET | OG 画像 (satori) |
| `/api/og/prediction` | GET | newspaper 風 OG |
| `/api/build-info` | GET | デプロイ識別 (sha/branch/builtAt) |
| `/api/auth/link-user` | POST | Firebase UID → DB user 紐付け |
| `/api/admin/*` | GET/POST | 管理用 (scrape-standings etc) |
| `/api/cron/*` | POST | scheduled tasks |

### 未実装 (仕様書約束、別 PR)
- `/api/predictions/parse-text` — 自然言語 → 予想 parse
- `/api/predictions/parse-image` — 画像 → OCR → 予想 parse

---

## 4. UI Components (主要)

| Component | 用途 |
|---|---|
| `src/app/predictions/new/RankingPicker` (内包) | **DnD 順位並び替え** (@dnd-kit) ← 2026-05-25 追加 |
| `src/components/PlayerCombobox` | **選手名 autocomplete** (DB suggestion) ← 2026-05-27 追加 |
| `src/components/ShareButton` | X シェア (OG URL 生成) |
| `src/components/StructuredData` | JSON-LD schema.org |

---

## 5. CI / Deploy (GitHub Actions)

`web/.github/workflows/npb-predictions-ci.yml` (実態は `.github/workflows/`)

### Flow
1. `push` to `dev` or `main` → trigger
2. ubuntu-latest runner (旧 self-hosted → 2026-05-17 に切替)
3. `npm ci` → `npm test` (vitest) → `npm run build` → `@cloudflare/next-on-pages`
4. Playwright install + local D1 migrate + seed (commentators + players)
5. `npm run test:e2e` (gating: 落ちたら deploy しない)
6. `wrangler pages deploy --branch=dev` (dev push 時) or `--branch=main` (main push 時)

### Secrets (GitHub Repository Secrets)
| Secret | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | wrangler 認証 |
| `CLOUDFLARE_ACCOUNT_ID` | `68852a9ea8d4375873c548608a7ac2bd` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web (build 時 bundle に baked) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `npb-predictions-league.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `npb-predictions-league` |
| `UNSPLASH_ACCESS_KEY` | (画像取得) |
| `YOUTUBE_DATA_API_KEY` | (動画関連) |

### 別 workflow (self-hosted runner 死亡で機能不全、ubuntu 切替予定)
- `npb-predictions-daily-scores.yml` — 日次スコア計算 cron
- `npb-cf-deploy-watch.yml` — デプロイ監視 + alert
- `npb-feature-health-alert.yml` — 機能死活監視
- `npb-scrape-alert.yml` — scrape 失敗 alert

---

## 6. Auth (Firebase)

| 項目 | 値 |
|---|---|
| **provider** | Google Sign-In のみ |
| **project_id** | `npb-predictions-league` |
| **auth_domain** | `npb-predictions-league.firebaseapp.com` |
| **console** | https://console.firebase.google.com/project/npb-predictions-league |
| **API key** | `AIzaSyBP83iv4LGr6PysIYXsmdipB4SEMhUZUa8` (public、ドメイン制限保護) |
| **client SDK** | `firebase` npm (lazy init in `src/lib/firebase.ts`) |
| **flow** | popup (`signInWithPopup`) → /api/auth/link-user → users table に upsert |

### Authorized domains (Firebase Console 側で要登録)
- ✅ `localhost`, `npb-predictions-league.firebaseapp.com` (デフォ)
- ❓ `npb-predictions.pages.dev` (production、未確認、ログイン popup 不発の真因疑い)
- ❓ `dev.npb-predictions.pages.dev` (dev、要追加)

---

## 7. OG 画像生成

### 7.1 アーキ
- `next/og` (satori 内蔵)
- font: jsdelivr の `@fontsource/noto-sans-jp` **woff** (woff2 は satori 非対応)
- 全 div に `display: "flex"` 必須 (satori 制約)
- **eager render** で satori エラーを catch → fallback PNG に逃げる
- 1x1 PNG 最終フォールバック (絶対 0B 返さない)

### 7.2 routes
- `/api/og/prediction?userId=N` — newspaper 風 (`src/app/api/og/prediction/route.tsx`)
- `/api/og/[type]` — season / commentator / scoreboard / weekly / monthly-champion / default (`src/app/api/og/[type]/route.tsx`)

### 7.3 E2E gating
- `web/e2e/image-gen.e2e.ts` で全 route の non-empty PNG + 本物 layout (>25KB) を check
- 「fallback で誤魔化す」regression を CI で検知

---

## 8. リポジトリ構成

```
~/repos/npb-predictions/
├── ARCHITECTURE.md       ← この文書
├── AGENTS.md             ← エージェント向け規約
├── README.md             ← 概要
├── SPEC.md               ← 機能仕様 (一部未実装)
├── GOAL.md               ← ビジネス目標
├── DEPLOY_CHECKLIST.md   ← D1 操作手順 (具体)
├── MARKETING_STRATEGY.md
├── MONETIZATION.md
├── plans/                ← 計画 markdown
│   └── plan_npb-players-autocomplete.md
├── .beads/               ← beads_rust (br) タスク管理
├── .github/workflows/    ← CI/CD
│   ├── npb-predictions-ci.yml
│   ├── npb-cf-deploy-watch.yml
│   ├── npb-feature-health-alert.yml
│   ├── npb-predictions-daily-scores.yml
│   └── npb-scrape-alert.yml
└── web/                  ← Next.js アプリ本体
    ├── DESIGN.md         ← デザイン system
    ├── PRODUCT_AUDIT.md  ← プロダクト監査
    ├── UX_DESIGN.md      ← UX 設計
    ├── package.json
    ├── wrangler.toml     ← CF Pages / D1 binding
    ├── playwright.config.ts
    ├── drizzle/          ← migrations (0000-0007)
    ├── e2e/              ← Playwright tests
    │   ├── app.e2e.ts
    │   ├── image-gen.e2e.ts
    │   ├── commentator-ranking.e2e.ts
    │   ├── news.e2e.ts
    │   └── scoreboard.e2e.ts
    ├── src/
    │   ├── app/
    │   │   ├── api/      ← Edge route handlers
    │   │   ├── predictions/new/page.tsx  ← DnD UI + Combobox
    │   │   ├── rankings/
    │   │   ├── games/
    │   │   ├── news/
    │   │   ├── groups/
    │   │   ├── settings/
    │   │   └── globals.css ← design tokens
    │   ├── components/
    │   │   ├── PlayerCombobox.tsx ← 2026-05-27 追加
    │   │   ├── ShareButton.tsx
    │   │   └── StructuredData.tsx
    │   ├── contexts/
    │   │   └── AuthContext.tsx ← Firebase 統合
    │   ├── db/
    │   │   ├── schema.ts     ← drizzle schema 真実
    │   │   ├── index.ts      ← getDb() helper
    │   │   ├── seed-commentators.sql
    │   │   └── seed-players.sql ← 2026-05-27 追加
    │   └── lib/
    │       ├── teams.ts      ← 12 球団 canonical 名 (SSOT)
    │       ├── scoring.ts    ← スコア計算ロジック
    │       ├── firebase.ts   ← Firebase Auth init
    │       └── seo-meta.ts   ← SEO metadata helpers
    └── public/
```

---

## 9. URL 一覧

| 環境 | URL |
|---|---|
| **production (main)** | https://npb-predictions.pages.dev |
| **dev preview** | https://dev.npb-predictions.pages.dev |
| **GitHub repo** | https://github.com/applego/npb-predictions |
| **CI runs** | https://github.com/applego/npb-predictions/actions |
| **CF Pages dashboard** | https://dash.cloudflare.com/68852a9ea8d4375873c548608a7ac2bd/pages/view/npb-predictions |
| **D1 dashboard** | https://dash.cloudflare.com/68852a9ea8d4375873c548608a7ac2bd/workers/d1/databases/39af9cc0-90d6-46fe-81cc-c8e31d7c3a66 |
| **Firebase Console** | https://console.firebase.google.com/project/npb-predictions-league |
| **build-info API** | https://npb-predictions.pages.dev/api/build-info |

---

## 10. 開発フロー要約

```bash
# 1. ブランチ切る (dev base)
git checkout dev && git pull --rebase
git checkout -b feat/<topic>

# 2. 実装 (web/src/...)
# 3. local 動作確認
cd web
npm install
npm run dev   # next dev (localhost:3000)
# or
npm run build:cf && npx wrangler pages dev .vercel/output/static --port 3456

# 4. ローカル D1 ある場合
npx wrangler d1 execute npb-predictions --local --command "SELECT ..."

# 5. typecheck/lint/test
npm run build      # next build = type-check
npm test           # vitest
npm run test:e2e   # Playwright (gates CI)

# 6. PR (base=dev)
git push -u origin feat/<topic>
gh pr create --base dev --head feat/<topic>

# 7. CI (E2E + build) pass → merge → dev push → 自動 deploy → dev URL 反映
gh pr merge --squash --delete-branch

# 8. dev で動作確認 → 問題なければ dev → main release PR
gh pr create --base main --head dev

# 9. main merge → production 自動 deploy → npb-predictions.pages.dev 反映
```

### Migration 適用フロー (慎重)
```bash
# 1. ローカルで作成 + テスト
cd web && npx wrangler d1 execute npb-predictions --local --file=drizzle/00XX_*.sql

# 2. dev branch にコミット
# 3. PR merge → dev push → CI で local D1 migrate 走る (E2E pass 確認)
# 4. 本番 D1 への適用は手動 (CI に組み込んでない、危険性配慮)
cd web && npx wrangler d1 execute npb-predictions --remote --file=drizzle/00XX_*.sql
```

---

## 11. 仕様 vs 実装 ギャップ (2026-05-28 時点)

| 仕様 (SPEC.md / UX_DESIGN.md) | 実装 |
|---|---|
| DnD 順位並び替え | ✅ 2026-05-25 実装 (@dnd-kit) |
| タイトル予想 選手 autocomplete | ✅ 2026-05-27 実装 (PlayerCombobox + /api/players) |
| 自然言語入力 (`/api/predictions/parse-text`) | ❌ 未実装 (404) |
| 画像入力 (`/api/predictions/parse-image`) | ❌ 未実装 (404) |
| 日次選手データ更新 | ❌ 未実装 (Phase 0 の static seed 60 名のみ、Phase 2 で scraper) |
| 既存予想あり時 edit/variant UI | ❌ 未実装 (locked 表示のみ) |

---

## 12. 既知の運用課題

| 課題 | 状況 |
|---|---|
| ログインボタン popup 不発 | Firebase Authorized Domains に `npb-predictions.pages.dev` / `dev.npb-predictions.pages.dev` 登録要確認 |
| 4 workflow が self-hosted runner 依存 (death) | ubuntu-latest 切替が必要 (daily-scores / cf-deploy-watch / feature-health / scrape-alert) |
| 本番 D1 への migration 自動化なし | CI に組み込むかは安全性とのトレードオフ |

---

## 13. References

- [Cloudflare D1 docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages docs](https://developers.cloudflare.com/pages/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
- [Drizzle ORM (SQLite)](https://orm.drizzle.team/docs/get-started-sqlite)
- [Firebase Auth (Web)](https://firebase.google.com/docs/auth/web/start)
- [@dnd-kit](https://docs.dndkit.com/)
- [next/og (satori)](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
