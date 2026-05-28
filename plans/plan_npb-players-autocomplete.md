# Plan: NPB 全選手リスト DB + 毎日自動更新 + タイトル予想 combobox

> 作成: 2026-05-26 / ワークフロー: dicklesworthstone-workflow
> 起点 issue: タイトル予想で選手名を手入力 (typo 防止/正確性なし)、SPEC.md にも「正しい選手データ保証」要件あり

---

## 1. 背景・要求

### 現状
- `/predictions/new` Step 3 (タイトル予想) で 6 部門 (首位打者/打点王/本塁打王/最多勝/最優秀防御率/最多セーブ) × 2 リーグ = 12 入力
- 選手名は **手入力 (placeholder: 例 大谷翔平)**、所属チームは select
- → typo / 表記揺れ / 退団選手の入力可能 = データ不整合の元

### ユーザー要求
1. NPB 12 球団 全選手 (~840 名) を DB に
2. **毎日自動更新** (npb.jp 公式から)
3. **タイトル予想を combobox/autocomplete 化**
4. **チーム選択時に絞り込み**
5. **「正しい」保証** (誤データ防止)

---

## 2. データソース選定

| ソース | 評価 |
|---|---|
| **npb.jp 公式** ✅ 採用 | 最新・正式・誤り無し。HTML 構造変化リスクは metamorphic test で吸収 |
| スポナビ | 構造マシだが規約グレー |
| Wikidata | 構造化 OK、登録漏れあり |
| 各球団公式 | 詳細だが 12 球団 uniform 化が大変 |

**主候補 URL**: `https://npb.jp/bis/players/` (球団別選手一覧)

---

## 3. データ Schema 案

```sql
-- drizzle/0007_npb_players.sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  npb_id TEXT UNIQUE,              -- npb.jp 内 ID (例: 93755148)
  name TEXT NOT NULL,              -- 公式表記 (例: 大谷 翔平)
  name_kana TEXT,                  -- フリガナ (検索高速化)
  team_id INTEGER NOT NULL REFERENCES teams(id),
  position TEXT,                   -- 投手/捕手/内野手/外野手
  uniform_number TEXT,
  bats TEXT,                       -- 右/左/両
  throws TEXT,                     -- 右/左
  is_active INTEGER DEFAULT 1,     -- 0=退団/抹消
  source_url TEXT,
  last_seen_at TEXT NOT NULL,      -- 最後に scraper で確認した日時
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_is_active ON players(is_active);
```

**teams テーブル想定**:
- 既存 `lib/teams.ts` のハードコード → DB 化済 or `team_name` 文字列キーで OK
- 既存 `actual_team_standings.team_name` と整合させる

---

## 4. アーキテクチャ

```
[GitHub Actions cron: 06:00 JST 毎日]
   ↓
[scripts/scrape-players.ts] (Node 実行、各球団 HTML パース)
   ↓
[diff vs production D1] → 新規/変更/削除を区別
   ↓
[wrangler d1 execute --remote --file=<diff.sql>] で upsert
   ↓
[Discord webhook] で「今日の変更: +3 新加入, -1 抹消」通知
   ↓
[frontend] /api/players?team=阪神 で API → combobox サジェスト
```

### API
- `GET /api/players?team=<name>&q=<query>&limit=20` — 選手検索
- `GET /api/players/:id` — 個別取得 (option)
- Edge runtime + D1 直接クエリ

### UI
- TitlePicker の選手名 input を **Combobox (Headless UI or Radix or自前)** に
- チーム select 変更時に `?team=` を絞り込み
- 入力 1 文字以上で suggest 表示、↑↓ Enter で選択
- DnD と同じく a11y 配慮

---

## 5. リスク & 軽減

| リスク | 軽減策 |
|---|---|
| npb.jp HTML 構造変化 | metamorphic test (golden file vs 最新 scrape の diff、変化大なら CI fail + Discord alert) |
| scrape 失敗で DB 劣化 | scraper 失敗時は DB 維持 + admin alert (劣化させない) |
| 退団選手の扱い | `is_active=0` で残す (過去予想の歴史保持)、新規予想では非表示 |
| 選手の同名異人 | `npb_id` で unique 識別、UI で `(チーム名)` 併記 |
| 12 球団分の uniform 化 | TeamScraper interface + 各球団 implementer (open/closed) |
| Cron 失敗の見逃し | Discord webhook + GH Actions の failure notification |

---

## 6. Phase 分解 (Bead 化 Phase 2 で行う)

### Phase 0: schema + 静的 seed (即体験)
- [P0.1] drizzle/0007_npb_players.sql 作成
- [P0.2] src/db/seed-players.sql (12 球団 × 30 主力 = 360 名) を手動で commit
- [P0.3] GET /api/players?team= 実装

### Phase 1: UI Combobox (主目的)
- [P1.1] @headlessui/react or downshift 導入 (or 自前で軽量実装)
- [P1.2] TitlePicker の選手名 input を combobox 化
- [P1.3] チーム select と連動した絞り込み
- [P1.4] a11y (キーボード, role, aria-)
- [P1.5] e2e test 追加

### Phase 2: Scraper + 自動更新
- [P2.1] scripts/scrape-players.ts (球団別 HTML パース)
- [P2.2] team scraper interface + 12 球団 implementer
- [P2.3] diff vs D1 + SQL 生成
- [P2.4] .github/workflows/npb-players-daily-scrape.yml (cron + Discord 通知)
- [P2.5] metamorphic test (golden file vs scrape)

### Phase 3: 透明性 + 運用
- [P3.1] /api/players response に last_updated_at 含める
- [P3.2] UI に「データ最終更新: YYYY-MM-DD」表示
- [P3.3] admin UI で手動編集 + override
- [P3.4] Discord webhook 統合

---

## 7. Definition of Done

- ✅ /predictions/new で実在選手を combobox から確実に選択できる
- ✅ チーム select で選手リストが絞り込まれる
- ✅ scraper が日次で動作し、新規/退団選手を追従
- ✅ scrape 失敗時に DB 劣化しない (alert で気付ける)
- ✅ E2E test で「combobox で大谷翔平を選べる」シナリオ pass
- ✅ production で 1 週間運用 → diff log が正常

---

## 8. 工数見積

- Phase 0: 1-1.5h (schema + seed 360 名)
- Phase 1: 1.5-2h (combobox UI + e2e)
- Phase 2: 2-3h (scraper + cron)
- Phase 3: 1-1.5h (透明性 + admin)
- **合計: 5.5-8h**

段階的 PR でリリース推奨:
- PR-A: Phase 0+1 (即 UX 改善、当日リリース)
- PR-B: Phase 2 (週内に運用基盤)
- PR-C: Phase 3 (運用品質)

---

## 9. 未確定事項 (Phase 1 多角検証で詰める)

- 選手 schema に `birthday` `debut_year` `salary` 入れるか? → 当面 No (YAGNI)
- combobox ライブラリ: @headlessui or 自前? → 既存 dnd-kit と相性で判断
- scraper の実行場所: GH Actions self-hosted 復活? or Cloudflare Cron Triggers? → 一旦 ubuntu-latest
- 同名選手の disambiguation UI: tooltip / 副表示? → MVP は チーム名併記
