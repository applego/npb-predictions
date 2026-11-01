#!/usr/bin/env python3
"""Fill the growth receipt from read-only first-party sources, so the loop measures without a hand-made file.

Until 2026-11-01 measure.py only read ~/.config/npb-predictions/growth-receipt.json, which nobody wrote:
every KPI stayed "missing" and the goal loop could not compare one week with the next.
This reads the production D1 with SELECT only (wrangler d1 execute --remote) and writes the metrics it can
back with a query. Metrics without a source here (visitors, profit, ASP results) are left out, so they stay
missing instead of becoming 0.
"""
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

ORIGIN = 'https://npb-predictions.pages.dev'
WEB = Path(__file__).resolve().parents[2] / 'web'
RECEIPT = Path(os.environ.get('NPB_GROWTH_RECEIPT', str(Path.home() / '.config/npb-predictions/growth-receipt.json')))
JST = dt.timezone(dt.timedelta(hours=9))

# metric id -> SELECT over the last 28 JST days (:since is the first day, inclusive).
QUERIES = {
    'result_views_28d': "SELECT count(DISTINCT day || session_hash) AS v FROM growth_events "
                        "WHERE event = 'result_view' AND day >= ':since'",
    'x_share_starts_28d': "SELECT count(*) AS v FROM growth_events WHERE event = 'x_share_start' AND day >= ':since'",
    'card_downloads_28d': "SELECT count(*) AS v FROM growth_events WHERE event = 'card_download' AND day >= ':since'",
    'x_result_tabs_28d': "SELECT count(DISTINCT day || session_hash) AS v FROM growth_events "
                         "WHERE event = 'result_view' AND source = 'x' AND day >= ':since'",
    'affiliate_clicks_28d': "SELECT count(*) AS v FROM affiliate_clicks WHERE created_at >= :since_epoch",
}


def run_select(sql):
    if not sql.lstrip().upper().startswith('SELECT'):
        raise ValueError('collect only reads')
    out = subprocess.run(['npx', '--no-install', 'wrangler', 'd1', 'execute', 'npb-predictions', '--remote',
                          '--json', '--command', sql], cwd=WEB, capture_output=True, text=True, timeout=120)
    if out.returncode != 0:
        raise RuntimeError(f'wrangler d1 execute failed ({out.returncode})')
    return json.loads(out.stdout)[0]['results'][0]['v']


def collect(now):
    since = (now.astimezone(JST).date() - dt.timedelta(days=27))
    since_epoch = int(dt.datetime.combine(since, dt.time(), JST).timestamp())
    metrics, sources = {}, {}
    for key, template in QUERIES.items():
        sql = template.replace(':since_epoch', str(since_epoch)).replace(':since', since.isoformat())
        try:
            value = run_select(sql)
        except (RuntimeError, ValueError, KeyError, IndexError, json.JSONDecodeError, subprocess.TimeoutExpired) as exc:
            print(f'{key}: not measured ({exc})', file=sys.stderr)
            continue
        if isinstance(value, int) and not isinstance(value, bool):
            metrics[key] = value
            sources[key] = 'd1:npb-predictions sha256:' + hashlib.sha256(sql.encode()).hexdigest()[:16]
    return metrics, sources


def main():
    now = dt.datetime.now(dt.timezone.utc)
    metrics, sources = collect(now)
    if not metrics:
        print('nothing measured; receipt left as it was', file=sys.stderr)
        return 1
    try:
        previous = json.loads(RECEIPT.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        previous = {}
    # Keep only externally sourced values this script does not own (e.g. reconciled profit), never stale copies of ours.
    kept = {k: v for k, v in (previous.get('metrics') or {}).items() if k not in QUERIES and k in (previous.get('sources') or {})}
    receipt = {'origin': ORIGIN, 'window_days': 28, 'data_through': now.isoformat(),
               'metrics': {**kept, **metrics},
               'sources': {**{k: previous['sources'][k] for k in kept}, **sources}}
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    tmp = RECEIPT.with_suffix('.tmp')
    tmp.write_text(json.dumps(receipt, ensure_ascii=False, indent=2))
    os.chmod(tmp, 0o600)
    tmp.replace(RECEIPT)
    print(json.dumps({'measured': metrics}, ensure_ascii=False), file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
