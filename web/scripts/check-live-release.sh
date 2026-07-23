#!/usr/bin/env bash
# Live release gate for user-facing share images and the heavy scoreboard route.
# This runs outside the Worker so Cloudflare 1102/timeout failures are observed
# as users and crawlers see them.

set -euo pipefail

BASE_URL="${1:?usage: check-live-release.sh https://example.pages.dev}"
BASE_URL="${BASE_URL%/}"

FAIL=0
ATTEMPTS="${LIVE_RELEASE_ATTEMPTS:-3}"
RETRY_DELAY_SECONDS="${LIVE_RELEASE_RETRY_DELAY_SECONDS:-5}"

duration_ok() {
  python3 - "$1" "$2" <<'PY'
import sys
duration = float(sys.argv[1])
limit = float(sys.argv[2])
sys.exit(0 if duration <= limit else 1)
PY
}

check_png() {
  local route="$1"
  local min_bytes="$2"
  local max_seconds="$3"
  local tmp code duration content_type size metrics attempt

  for attempt in $(seq 1 "$ATTEMPTS"); do
    tmp="$(mktemp)"
    if metrics="$(
      curl -L -sS --max-time "$((max_seconds + 10))" -o "$tmp" \
        -w "%{http_code} %{time_total}" "$BASE_URL$route"
    )"; then
      read -r code duration <<< "$metrics"
    else
      code="000"
      duration="999"
    fi
    content_type="$(file -b --mime-type "$tmp" 2>/dev/null || echo "unknown")"
    size="$(wc -c < "$tmp" | tr -d ' ')"

    if [[ "$code" =~ ^2 ]] &&
      [[ "$content_type" == "image/png" ]] &&
      (( size >= min_bytes )) &&
      duration_ok "$duration" "$max_seconds"; then
      printf 'OK png route=%s code=%s type=%s bytes=%s seconds=%s attempt=%s\n' \
        "$route" "$code" "$content_type" "$size" "$duration" "$attempt"
      rm -f "$tmp"
      return
    fi

    if (( attempt < ATTEMPTS )); then
      printf 'WARN retry png route=%s code=%s type=%s bytes=%s seconds=%s attempt=%s/%s\n' \
        "$route" "$code" "$content_type" "$size" "$duration" "$attempt" "$ATTEMPTS" >&2
      rm -f "$tmp"
      sleep "$RETRY_DELAY_SECONDS"
    fi
  done

  printf 'FAIL png route=%s code=%s type=%s bytes=%s seconds=%s expected_bytes>=%s expected_seconds<=%s attempts=%s\n' \
    "$route" "$code" "$content_type" "$size" "$duration" "$min_bytes" "$max_seconds" "$ATTEMPTS" >&2
  FAIL=1
  rm -f "$tmp"
}

check_html() {
  local route="$1"
  local min_bytes="$2"
  local max_seconds="$3"
  local tmp code duration content_type size metrics attempt

  for attempt in $(seq 1 "$ATTEMPTS"); do
    tmp="$(mktemp)"
    if metrics="$(
      curl -L -sS --max-time "$((max_seconds + 10))" -o "$tmp" \
        -w "%{http_code} %{time_total}" "$BASE_URL$route"
    )"; then
      read -r code duration <<< "$metrics"
    else
      code="000"
      duration="999"
    fi
    content_type="$(file -b --mime-type "$tmp" 2>/dev/null || echo "unknown")"
    size="$(wc -c < "$tmp" | tr -d ' ')"

    if [[ "$code" =~ ^2 ]] &&
      [[ "$content_type" == "text/html" ]] &&
      (( size >= min_bytes )) &&
      duration_ok "$duration" "$max_seconds"; then
      printf 'OK html route=%s code=%s type=%s bytes=%s seconds=%s attempt=%s\n' \
        "$route" "$code" "$content_type" "$size" "$duration" "$attempt"
      rm -f "$tmp"
      return
    fi

    if (( attempt < ATTEMPTS )); then
      printf 'WARN retry html route=%s code=%s type=%s bytes=%s seconds=%s attempt=%s/%s\n' \
        "$route" "$code" "$content_type" "$size" "$duration" "$attempt" "$ATTEMPTS" >&2
      rm -f "$tmp"
      sleep "$RETRY_DELAY_SECONDS"
    fi
  done

  printf 'FAIL html route=%s code=%s type=%s bytes=%s seconds=%s expected_bytes>=%s expected_seconds<=%s attempts=%s\n' \
    "$route" "$code" "$content_type" "$size" "$duration" "$min_bytes" "$max_seconds" "$ATTEMPTS" >&2
  FAIL=1
  rm -f "$tmp"
}

check_png "/api/og/prediction?userId=1&year=2026" 25000 8
check_png "/api/og/season?year=2026" 10000 8
check_png "/api/og/commentator?userId=1" 10000 8
check_png "/api/og/standings" 10000 8
check_png "/api/newspaper/hanshin-tigers" 25000 8
check_png "/api/ranking-card/overall" 10000 8
check_html "/rankings/scoreboard?year=2026&view=trend" 50000 8

exit "$FAIL"
