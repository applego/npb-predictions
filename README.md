# npb-predictions

NPB 予想リーグプラットフォーム — Next.js + Cloudflare Pages + Drizzle + Playwright

## Quick start

```bash
cd web
npm install
npm run dev   # http://localhost:3000
```

## ドキュメント

- [`AGENTS.md`](./AGENTS.md) — エージェント・開発者向けガイド
- [`GOAL.md`](./GOAL.md) — KGI / KPI / KDI (SSOT)
- [`SPEC.md`](./SPEC.md) — 機能仕様
- [`MARKETING_STRATEGY.md`](./MARKETING_STRATEGY.md)
- [`MONETIZATION.md`](./MONETIZATION.md)
- [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md)

## CI / Deploy

- self-hosted runner (mac-2016-intel) でテスト → Cloudflare Pages へ自動 deploy
- 詳細: `.github/workflows/npb-predictions-ci.yml`

## 由来

2026-04-28 に [`applego/hohho_worlds`](https://github.com/applego/hohho_worlds) の `companies/npb-predictions/` から独立 repo として split。

## ライセンス

(TBD)
