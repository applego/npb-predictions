# NPB Predictions League / Daily YouTube Hub - SPEC

## 0. 目的

5人の固定メンバーで始める、プロ野球順位予想・個人タイトル予想・途中経過観戦を一体化したサービスを作る。

このサービスは単なる予想登録ツールではなく、以下を満たすことを目的とする。

* 開幕前に最速で予想を登録できる
* 開幕後は毎日見たくなる途中経過画面がある
* 年末に年間王者を決められる
* 過去シーズンの予想と結果を振り返れる
* SEO / AI検索で過去順位・過去成績ページが流入導線になる
* Daily YouTube と連動して、サイトへの送客と継続利用を生む
* 将来は友達リーグ機能へ拡張できる

## 1. プロダクト定義

### 1.1 サービス名 仮
* NPB Predictions League
* 予想リーグ
* プロ野球予想リーグ

### 1.2 コア価値
1. 入力が速い
2. 比較が面白い
3. シーズン中も毎日意味がある

### 1.3 初期ターゲット
* まずは5人の固定メンバー
* スマホで使う比率が高い

### 1.4 将来ターゲット
* 友達同士の私設リーグ
* 野球好きコミュニティ
* YouTube視聴者
* SEO流入ユーザー

## 2. スコープ

### 2.1 MVPに含めるもの
* 2025/2026 シーズン管理
* 5人のメンバー管理
* セ/パ リーグ順位予想
* セ/パ 個人タイトル予想（打率/打点/本塁打/最多勝/防御率/セーブ）
* 予想の確定とロック
* 現在の途中経過画面
* 比較画面
* 年間総合スコア計算
* 月間/副賞計算
* シェア機能（文言+画像）
* SEOページ
* YouTube導線

### 2.2 MVPに含めないもの
* コメント機能、高度な通知、Instagram自動投稿、課金基盤

## 4. 予想ルール

### 順位予想点
| diff | score |
|------|-------|
| 0 | +5 |
| 1 | +3 |
| 2 | +1 |
| 3 | -1 |
| 4 | -3 |
| 5 | -5 |

### 個人タイトル点
* 的中 +3

### 副賞
* 前半戦王者、月間王者、交流戦王者、一人勝ちタイトル賞、大穴賞

## 12. データモデル

Users, Seasons, Predictions, RankingPicks, TitlePicks, ActualTeamStandingsSnapshots, ActualTitleSnapshots, ScoreSnapshots, Awards, ShareAssets, Videos

## 14. API要件

### Public
GET /api/seasons, /api/seasons/:year, /api/seasons/:year/current-scoreboard, /api/seasons/:year/predictions, /api/seasons/:year/users/:userId, /api/seasons/:year/titles, /api/seasons/:year/archive, /api/seo/:year/:league/final-standings, /api/seo/:year/title-leaders

### Write
POST /api/predictions/parse-text, /api/predictions/parse-image, /api/predictions, PATCH /api/predictions/:id, POST /api/predictions/:id/lock

### Admin
POST /api/admin/seasons, /api/admin/seeds/import, /api/admin/actual-standings/snapshot, /api/admin/title-snapshots, /api/admin/recalculate-scores, /api/admin/videos

## 17. 技術方針
* Frontend: Next.js + Tailwind CSS
* API: Next.js Route Handlers or Hono
* DB: Postgres (Supabase/Neon)
* Storage: Cloudflare R2
* Hosting: Cloudflare Pages or Vercel
* Batch: CF Workers Cron or GitHub Actions

## 21. 実装優先順位

### Phase 1
DB schema, seed import, 予想閲覧画面, 現在スコア画面, 比較画面, 手入力/編集

### Phase 2
SEOページ, シェア機能, 月間王者, タイトル画面, YouTube導線

### Phase 3
自然言語入力, 画像入力, 日次自動更新, ショート運用導線

### Phase 4
友達リーグ, 招待, 公開プロフィール, 一部収益化導線
