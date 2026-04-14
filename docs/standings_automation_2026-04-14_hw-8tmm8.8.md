# Standings 2026データ投入 + シーズン中自動更新 実装計画

**Bead**: hw-8tmm8.8  
**作成日**: 2026-04-14  
**ステータス**: 実装計画完了

---

## 📋 概要

2026年シーズンの実際の順位データを投入し、シーズン中に自動更新するメカニズムを実装する。

---

## 🎯 目的

1. **2026年データ投入**: 現在のNPB順位データをDBに投入
2. **自動更新**: シーズン中、日次でstandingsを自動更新
3. **スコア再計算**: 順位更新後、全ユーザーのスコアを自動再計算

---

## 📊 現状分析

### 既存リソース

1. **update-standings.ts スクリプト** (`web/scripts/update-standings.ts`)
   - STDINから順位データを受け取り、DBに投入
   - スコア再計算APIを自動実行
   - 使用例:
     ```bash
     echo '{"central":["巨人","阪神","DeNA","広島","中日","ヤクルト"],"pacific":["ソフトバンク","オリックス","ロッテ","楽天","日本ハム","西武"]}' | \
       npx tsx scripts/update-standings.ts --season-id 1
     ```

2. **API Endpoints**
   - `POST /api/admin/actual-standings/snapshot`: 順位データ投入
   - `POST /api/admin/recalculate-scores`: スコア再計算

3. **DB Schema**
   - `actualTeamStandings`: スナップショット形式で順位を保存
   - `scoreSnapshots`: ユーザースコアのスナップショット

### 課題

1. **データソース不明**: 2026年の実際の順位データをどこから取得するか
2. **自動化未実装**: 日次更新のメカニズムがない
3. **勝敗数データなし**: 現在のスクリプトは順位のみ（wins/losses/draws=0）

---

## 🏗️ 実装計画

### Option A: GitHub Actions（推奨）

**メリット**:
- 無料（public repo）
- 既存のリポジトリに統合
- cron jobで日次実行

**実装**:

```yaml
# .github/workflows/update-npb-standings.yml
name: Update NPB Standings

on:
  schedule:
    - cron: '0 15 * * *'  # 毎日 0:00 JST (15:00 UTC)
  workflow_dispatch:  # 手動実行も可能

jobs:
  update-standings:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: companies/npb-predictions/web
        run: npm install
      
      - name: Fetch NPB Standings
        id: fetch
        run: |
          # TODO: Implement scraping from NPB official site
          # For now, use manual data
          echo '{"central":["巨人","阪神","DeNA","広島","中日","ヤクルト"],"pacific":["ソフトバンク","オリックス","ロッテ","楽天","日本ハム","西武"]}' > standings.json
      
      - name: Update Standings via API
        working-directory: companies/npb-predictions/web
        env:
          NEXT_PUBLIC_API_BASE: ${{ secrets.NPB_API_BASE }}
        run: |
          cat ../../../standings.json | npx tsx scripts/update-standings.ts --season-id 1
```

### Option B: Cloudflare Workers Cron Triggers

**メリット**:
- サーバーレス
- 既存のCloudflare D1と統合
- 本番環境で直接実行

**実装**:

```toml
# wrangler.toml に追加
[triggers]
crons = ["0 15 * * *"]  # 毎日 0:00 JST
```

```typescript
// workers/scheduled-standings-update.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const standings = await fetchNPBStandings();
    await updateStandings(env.DB, standings);
    await recalculateScores(env.DB, 1);
  }
}
```

### Option C: 外部スクレイピングサービス（Apify）

**メリット**:
- NPB公式サイトのスクレイピングを自動化
- エラーハンドリング・リトライ機能
- 勝敗数データも取得可能

**実装**:
1. Apify ActorでNPB順位ページをスクレイピング
2. 結果をWebhook経由でAPIに送信
3. GitHub Actionsまたは別サービスでApify Actorを日次実行

---

## 🔧 推奨実装プラン（3段階）

### Phase 1: 手動データ投入（今すぐ実行可能）

```bash
# 1. 2026年4月14日時点の順位を確認（NPB公式サイト）
# 2. データを準備
echo '{
  "central": ["巨人","阪神","DeNA","広島","中日","ヤクルト"],
  "pacific": ["ソフトバンク","オリックス","ロッテ","楽天","日本ハム","西武"]
}' | npx tsx companies/npb-predictions/web/scripts/update-standings.ts --season-id 1

# 3. season_id=1 が2026年であることを確認
```

### Phase 2: GitHub Actions自動更新（別bead）

- `.github/workflows/update-npb-standings.yml` 作成
- スクレイピングロジック実装（NPB公式 or Yahoo!スポーツ）
- secrets設定（NPB_API_BASE）

### Phase 3: 勝敗数データ取得（別bead）

- NPB公式サイトから勝敗数をスクレイピング
- `update-standings.ts` を拡張（wins/losses/draws対応）
- より正確なスコア計算

---

## ⚠️ 考慮事項

### 1. データソースの選定

**候補**:
- NPB公式サイト（https://npb.jp/）
- Yahoo!スポーツ（https://sports.yahoo.co.jp/npb/）
- スポーツナビ

**選定基準**:
- robots.txtで許可されているか
- HTMLが安定しているか（パース可能性）
- レート制限

### 2. Autonomous Scope 遵守

GOAL.mdによると:
- **Requires Approval**: deployment, external API integration
- **Forbidden**: production DB direct access

**対応**:
- Phase 1（手動投入）: ユーザー承認後に実行
- Phase 2（GitHub Actions）: ワークフロー作成のみ、実行はユーザーがトリガー
- Phase 3（スクレイピング）: データソース選定はユーザーに確認

### 3. season_id の確認

**確認コマンド**:
```sql
-- D1 コンソールで実行
SELECT id, year, label, isActive FROM seasons WHERE year = 2026;
```

**期待される結果**:
- `id=1, year=2026, label="2026シーズン", isActive=1`

もし異なる場合、`--season-id` パラメータを調整。

### 4. PAST_SEASONS_WITH_DATA の更新

`web/src/app/standings/page.tsx`:
```typescript
// line 11
const PAST_SEASONS_WITH_DATA = [2023, 2024, 2025] as const;
```

→ 2026年データ投入後、必要に応じて更新（ただし、2026年はまだ「current」なので追加不要）

---

## 📁 成果物

### Phase 1（このbead）

- ✅ このドキュメント（実装計画）
- ⏳ 手動データ投入（ユーザー承認後）

### Phase 2（別bead推奨）

- GitHub Actions ワークフロー
- NPBスクレイピングスクリプト

### Phase 3（別bead推奨）

- 勝敗数データ取得
- update-standings.ts 拡張

---

## 🔄 次のステップ

1. **ユーザー承認待ち**:
   - 2026年4月14日時点のNPB順位確認
   - データソース選定（NPB公式 or Yahoo!スポーツ）
   - Phase 1 手動投入の実行承認

2. **Phase 1 実行** (承認後):
   ```bash
   cd companies/npb-predictions/web
   # 実際の順位データに置き換えて実行
   echo '{"central":[...],"pacific":[...]}' | npx tsx scripts/update-standings.ts --season-id 1
   ```

3. **Phase 2 bead作成** (hw-8tmm8.14):
   - タイトル: "GitHub Actions: NPB順位自動更新"
   - 依存: hw-8tmm8.8

4. **検証**:
   - `/standings?year=2026` でデータ表示確認
   - スコアボードの再計算確認

---

## 📝 Notes

- **シーズン中**: 2026年3月～10月は毎日更新が必要
- **オフシーズン**: 11月～2月は更新不要
- **最終順位**: シーズン終了後、`--final` フラグで最終データ投入
- **タイムゾーン**: GitHub Actions cronはUTC、JSTに変換（0:00 JST = 15:00 UTC前日）

---

## ✅ Done条件（Phase 1）

- [x] 実装計画ドキュメント作成（このファイル）
- [ ] ユーザー承認取得
- [ ] season_id=1が2026年であることを確認
- [ ] 2026年4月14日時点の実順位データ投入
- [ ] `/standings?year=2026` でデータ表示確認

**Status**: 実装計画完了。Phase 1実行はユーザー承認後。
