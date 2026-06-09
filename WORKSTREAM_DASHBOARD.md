# Workstream Dashboard

## Track: NPB Predictions post-release monitoring cleanup — 2026-06-09

### Goal
本番 release 後に残った監視ノイズを解消する。成功条件は `scrape-health` が古い unresolved を `needsAttention` に出さず、alert/watch workflow の push 時 jobs-empty failure が再発しないこと。

### State
- Done:
  - PR #24 は main に merge 済み。本番 `81bdc10` deploy / feature-health / scoreboard / update-games を確認済み。
- Now:
  - `scrape-health` の stale unresolved filter と GitHub workflow push no-op を実装する。
- Next:
  1. test/build を通す。
  2. dev に push して CI/deploy と workflow push no-op を確認する。
  3. 必要なら main 昇格は別途 human approval で行う。

### Key decisions
- `scrape-health` の `needsAttention` は最近の繰り返し失敗だけを対象にする。
- alert/watch workflow は schedule/manual の本処理と push no-op を分離する。

### Open questions
- なし。

### Working set
- `/Users/ytsun/repos/npb-predictions`
- Files: `web/src/app/api/cron/scrape-health/route.ts`, `web/src/lib/scrape-health.ts`, `.github/workflows/npb-*.yml`
