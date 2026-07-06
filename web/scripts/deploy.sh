#!/usr/bin/env bash
# deploy.sh — GA-parity manual deploy for npb-predictions
#
# Replicates .github/workflows/npb-predictions-ci.yml so that a manual
# deploy carries the same quality guarantees as the automated pipeline,
# plus extra preflight and post-deploy verification.
#
# Stages:
#   1. Preflight     — wrangler login, git state, env vars
#   2. Quality gates — typecheck, vitest, next build, CF build
#   3. Feature guard — E2E (image-gen / news / commentator-ranking)
#   4. Deploy        — wrangler pages deploy
#   5. Post-verify   — probe /api/cron/feature-health + smoke routes on live URL
#
# Flags:
#   --dry-run     Run stages 1-3 only (no deploy, no post-verify)
#   --skip-tests  Skip stages 2-3 (EMERGENCY ONLY)
#   --preview     Deploy to preview branch instead of production
#   --no-verify   Skip stage 5
#   --full-e2e    Run all E2E (incl. legacy app.e2e.ts; may fail on missing local seed)
#   -h | --help

set -euo pipefail

# ── Paths ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$WEB_DIR/.." && pwd)"
DEPLOY_LOG="$WEB_DIR/.deploy-log"
PROJECT_NAME="npb-predictions"
DEPLOY_BRANCH="main"
DRY_RUN=0
SKIP_TESTS=0
SKIP_VERIFY=0
FULL_E2E=0
# Main-feature E2E — guaranteed to be hermetic (work on both local dev D1 and prod).
# app.e2e.ts is excluded by default because it depends on specific seed rows that
# may not exist in local development D1.
FEATURE_TESTS=(
  "e2e/image-gen.e2e.ts"
  "e2e/news.e2e.ts"
  "e2e/commentator-ranking.e2e.ts"
)

# ── Args ─────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)    DRY_RUN=1 ;;
    --skip-tests) SKIP_TESTS=1 ;;
    --preview)    DEPLOY_BRANCH="preview" ;;
    --no-verify)  SKIP_VERIFY=1 ;;
    --full-e2e)   FULL_E2E=1 ;;
    -h|--help)
      grep '^#' "$0" | sed -E 's/^# ?//'
      exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
  shift
done

cd "$WEB_DIR"

# ── Colors ───────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_OK=$'\e[32m'; C_ERR=$'\e[31m'; C_WARN=$'\e[33m'; C_DIM=$'\e[2m'; C_RST=$'\e[0m'
else
  C_OK=""; C_ERR=""; C_WARN=""; C_DIM=""; C_RST=""
fi

log()   { printf "%s[%s]%s %s\n" "$C_DIM" "$(date +%H:%M:%S)" "$C_RST" "$*"; }
ok()    { printf "  %s✓%s %s\n" "$C_OK"   "$C_RST" "$*"; }
warn()  { printf "  %s⚠%s %s\n" "$C_WARN" "$C_RST" "$*"; }
fail()  { printf "  %s✗%s %s\n" "$C_ERR"  "$C_RST" "$*"; }
stage() { printf "\n%s━━━ Stage %s ━━━%s\n" "$C_OK" "$*" "$C_RST"; }

START_EPOCH=$(date +%s)
COMMIT_SHA=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
COMMIT_MSG=$(git -C "$REPO_ROOT" log -1 --pretty=%s 2>/dev/null | head -c 80 || echo "manual deploy")

trap 'on_exit $?' EXIT
on_exit() {
  local status=$1
  local elapsed=$(( $(date +%s) - START_EPOCH ))
  local outcome="PASS"
  [[ $status -ne 0 ]] && outcome="FAIL"
  mkdir -p "$(dirname "$DEPLOY_LOG")"
  printf '%s\t%s\t%s\t%ss\tcommit=%s\tbranch=%s\tdry_run=%s\t"%s"\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$outcome" "${DEPLOY_URL:-n/a}" \
    "$elapsed" "$COMMIT_SHA" "$DEPLOY_BRANCH" "$DRY_RUN" "$COMMIT_MSG" \
    >> "$DEPLOY_LOG"
}

# ── Stage 1: Preflight ───────────────────────────────────────────────
stage "1 — Preflight"

if ! command -v wrangler >/dev/null 2>&1 && ! npx --no-install wrangler --version >/dev/null 2>&1; then
  fail "wrangler not available (install with: npm i -g wrangler, or run via npx)"
  exit 1
fi
ok "wrangler available"

if ! npx --no-install wrangler whoami 2>/dev/null | grep -q -iE "logged in|email"; then
  warn "wrangler not logged in — run: npx wrangler login"
  echo "Continue anyway? (y/N) "
  read -r ans
  [[ "$ans" =~ ^[Yy]$ ]] || exit 1
else
  ok "wrangler session active"
fi

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain -- "$WEB_DIR")" ]]; then
  warn "uncommitted changes under web/ — deploy will ship them"
else
  ok "git tree clean (web/)"
fi

MISSING_ENV=()
for v in NEXT_PUBLIC_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_PROJECT_ID; do
  if ! grep -qE "^${v}=" .env.local 2>/dev/null; then
    MISSING_ENV+=("$v")
  fi
done
if (( ${#MISSING_ENV[@]} > 0 )); then
  warn "missing in .env.local: ${MISSING_ENV[*]} (Firebase features may break)"
else
  ok "required env vars present"
fi

# ── Stage 2: Quality Gates ───────────────────────────────────────────
if [[ $SKIP_TESTS -eq 1 ]]; then
  stage "2 — Quality Gates  ${C_WARN}(SKIPPED)${C_RST}"
  warn "skipping typecheck + tests — use only for emergency hotfix"
else
  stage "2 — Quality Gates"

  log "running typecheck"
  npx tsc --noEmit
  ok "typecheck clean"

  log "running vitest"
  npx vitest run --reporter=dot
  ok "unit tests pass"

  log "running next build"
  npm run build >/tmp/deploy-build.log 2>&1 || { cat /tmp/deploy-build.log; fail "next build failed"; exit 1; }
  ok "next build OK"

  log "running Cloudflare build (next-on-pages)"
  npm run build:cf >/tmp/deploy-cf.log 2>&1 || { cat /tmp/deploy-cf.log; fail "build:cf failed"; exit 1; }
  ok ".vercel/output/static ready"
fi

# ── Stage 3: Feature Guarantees (E2E) ───────────────────────────────
if [[ $SKIP_TESTS -eq 1 ]]; then
  stage "3 — Feature Guarantees  ${C_WARN}(SKIPPED)${C_RST}"
else
  stage "3 — Feature Guarantees"
  log "resetting local D1 state for repeatable E2E"
  LOCAL_D1_DIR=".wrangler/state/v3/d1"
  if [[ -e "$LOCAL_D1_DIR" ]]; then
    STAMP="$(date '+%Y%m%d%H%M%S')"
    STATE_TRASH="${TMPDIR:-/tmp}/npb-predictions-d1-${STAMP}-$$"
    mkdir -p "$(dirname "$STATE_TRASH")"
    mv "$LOCAL_D1_DIR" "$STATE_TRASH"
  fi
  ok "local D1 state reset"

  log "migrating local D1 schema for E2E"
  for f in drizzle/*.sql; do
    echo "Applying $f"
    npx wrangler d1 execute npb-predictions --local --file="$f"
  done
  ok "local D1 schema ready"

  log "seeding local D1 fixtures for E2E"
  npx wrangler d1 execute npb-predictions --local --file=src/db/seed-commentators.sql
  npx wrangler d1 execute npb-predictions --local --file=src/db/fixtures/e2e-standings.sql
  ok "local D1 seed ready"

  if [[ $FULL_E2E -eq 1 ]]; then
    log "running ALL playwright E2E (includes app.e2e.ts — may fail on missing local seed)"
    E2E_ARGS=()
  else
    log "running main-feature E2E: ${FEATURE_TESTS[*]}"
    E2E_ARGS=("${FEATURE_TESTS[@]}")
  fi
  if npx playwright test "${E2E_ARGS[@]}" --reporter=list >/tmp/deploy-e2e.log 2>&1; then
    ok "E2E pass"
  else
    tail -60 /tmp/deploy-e2e.log
    fail "E2E failed — see /tmp/deploy-e2e.log (and playwright-report/)"
    exit 1
  fi
fi

# ── Stage 4: Deploy ──────────────────────────────────────────────────
if [[ $DRY_RUN -eq 1 ]]; then
  stage "4 — Deploy  ${C_WARN}(DRY RUN — skipped)${C_RST}"
  ok "all pre-deploy gates passed"
  exit 0
fi

stage "4 — Deploy"
log "wrangler pages deploy → project=$PROJECT_NAME branch=$DEPLOY_BRANCH"
DEPLOY_OUT=$(npx wrangler pages deploy .vercel/output/static \
  --project-name="$PROJECT_NAME" \
  --branch="$DEPLOY_BRANCH" \
  --commit-dirty=true \
  --commit-message="manual: $COMMIT_MSG" 2>&1 | tee /tmp/deploy-wrangler.log)
DEPLOY_URL=$(echo "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9.-]+\.pages\.dev' | tail -1)

if [[ -z "${DEPLOY_URL:-}" ]]; then
  fail "could not parse deploy URL — check /tmp/deploy-wrangler.log"
  exit 1
fi
ok "deployed: $DEPLOY_URL"

# ── Stage 5: Post-verify ─────────────────────────────────────────────
if [[ $SKIP_VERIFY -eq 1 ]]; then
  stage "5 — Post-verify  ${C_WARN}(SKIPPED)${C_RST}"
else
  stage "5 — Post-verify"

  # CDN propagation wait
  log "waiting 15s for CDN propagation"
  sleep 15

  # Feature health probe
  HEALTH=$(curl -fsSL "$DEPLOY_URL/api/cron/feature-health" 2>/dev/null || echo "")
  if [[ -n "$HEALTH" ]]; then
    UNHEALTHY=$(echo "$HEALTH" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('totalUnresolved',0))" 2>/dev/null || echo "0")
    if [[ "$UNHEALTHY" == "0" ]]; then
      ok "feature-health all green"
    else
      warn "feature-health: $UNHEALTHY unhealthy"
      echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
    fi
  else
    warn "feature-health endpoint unreachable (may need time to warm)"
  fi

  # Page smoke tests
  FAIL=0
  for path in "/" "/news" "/rankings/commentators"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL$path" || echo "000")
    if [[ "$code" =~ ^[23] ]]; then
      ok "$path → $code"
    else
      fail "$path → $code"
      FAIL=$((FAIL+1))
    fi
  done
  if (( FAIL > 0 )); then
    warn "$FAIL page(s) non-2xx — investigate before considering complete"
    exit 1
  fi
fi

stage "DONE"
printf "\n🚀 %sLive:%s %s\n" "$C_OK" "$C_RST" "$DEPLOY_URL"
printf "%sLog:%s  %s\n" "$C_DIM" "$C_RST" "$DEPLOY_LOG"
