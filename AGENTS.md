# AGENTS.md — applego/npb-predictions

NPB 予想リーグプラットフォーム。Next.js + Cloudflare Pages + Drizzle + Playwright。

このリポジトリは元々 `applego/hohho_worlds` の `companies/npb-predictions/` にあったが、2026-04-28 に独立 repo として split された。詳細は [hohho_worlds の plans/plan_split_companies.md](https://github.com/applego/hohho_worlds/blob/main/plans/plan_split_companies.md) 参照。

---

## 1. ミッション & 目標

- KGI/KPI/KDI: `GOAL.md` を Single Source of Truth とする
- 自律スコープ: `GOAL.md` の `autonomy:` セクション — tier1/2/3 の境界を必ず確認

---

## 2. このリポジトリの構成

```
.
├─ web/                Next.js アプリ (本体)
│  ├─ src/             ソース
│  ├─ e2e/             Playwright E2E テスト
│  ├─ drizzle/         DB マイグレーション
│  └─ scripts/         deploy.sh, seed 等
├─ data/               予想データ・コメンテーター情報
├─ marketing/          マーケ素材
├─ scripts/            スクレイピング・同期スクリプト
├─ docs/               技術ドキュメント
├─ .beads/             br (beads_rust) の独立 instance
├─ .github/workflows/  CI / Deploy
├─ GOAL.md             KGI/KPI/KDI SSOT
├─ MARKETING_STRATEGY.md
├─ MONETIZATION.md
├─ SPEC.md
└─ DEPLOY_CHECKLIST.md
```

---

## 3. タスクを取る

```bash
br list --status open
bv --robot-triage --json | head -5
```

完了時:

```bash
br close <id>
ms feedback add <skill_id> --positive --comment "..."
br sync --flush-only
git add .beads/ <changed files>
git commit -m "..."
```

---

## 4. 開発フロー

```bash
# Web 開発
cd web
npm install
npm run dev          # http://localhost:3000

# テスト
npm test             # vitest
npx playwright test  # E2E (要 build)

# build
npm run build
npx @cloudflare/next-on-pages

# デプロイ (手動)
./scripts/deploy.sh
```

---

## 5. CI / Deploy

- **`.github/workflows/npb-predictions-ci.yml`**: main/dev push で self-hosted runner (mac-2016-intel) でテスト + Cloudflare Pages deploy
- **`.github/workflows/npb-cf-deploy-watch.yml`**: deploy stale 検知 + 自動 issue 作成
- **`.github/workflows/npb-feature-health-alert.yml`**: feature-health 監視
- **`.github/workflows/npb-predictions-daily-scores.yml`**: NPB 試合結果取り込み
- **`.github/workflows/npb-scrape-alert.yml`**: スクレイプ失敗監視

### Secrets (GitHub → applego/npb-predictions → Settings → Secrets)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `YOUTUBE_DATA_API_KEY` (optional, for content sync)
- `UNSPLASH_ACCESS_KEY` (optional, for og images)

---

## 6. Cloudflare Pages

- Project name: `npb-predictions`
- Production branch: `main`
- Build output: `.vercel/output/static`
- Build command: `npm run build && npx @cloudflare/next-on-pages`
- Root directory: `web`

---

## 7. hohho_worlds との連携

このリポジトリは独立しているが、`hohho_worlds` の flywheel orchestrator から `gh API` 経由で workflow を dispatch される。`hohho_worlds/repos.yaml` に entry がある。

- 大きな構造変更や institution との連携は `hohho_worlds` の epic に登録する
- 単独で完結する機能改修・バグ修正・運用は本 repo の bead で完結させる

---

## 8. 品質保証

- `ubs .` でコミット前にスキャン
- E2E テストで escape hatch を作らない (silent skip / OR条件 / 内容未検証 → 全て NG)
- UI 変更時は Playwright でスクリーンショット確認
