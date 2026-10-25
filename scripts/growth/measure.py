#!/usr/bin/env python3
"""Read public routes and externally sourced receipts; never invent revenue."""
import datetime as dt
import hashlib
import json
import os
import math
import re
import sys
import urllib.request
from pathlib import Path

ORIGIN = 'https://npb-predictions.pages.dev'
METRICS = ['contribution_profit_28d', 'visitors_28d', 'x_visits_28d', 'affiliate_confirmed_28d', 'result_views_28d', 'x_share_starts_28d', 'card_downloads_28d', 'x_result_tabs_28d']

def growth_events(report):
    if report.get('windowDays') != 28 or not isinstance(report.get('rows'), list):
        raise ValueError('invalid growth event window/rows')
    rows = report['rows']
    result = {}
    # Event counts are additive across dimensions; distinct tabs are not.
    for key, event in [('x_share_starts_28d', 'x_share_start'), ('card_downloads_28d', 'card_download')]:
        values = [row['events'] for row in rows if row['event'] == event]
        if any(not isinstance(v, int) or isinstance(v, bool) or v < 0 for v in values):
            raise ValueError('invalid growth event count')
        result[key] = {'value': sum(values), 'status': 'ok', 'data_through': report['observedAt'], 'sample_size': len(rows)}
    totals = report.get('dailyTotals')
    for key, field in [('result_views_28d', 'tabs'), ('x_result_tabs_28d', 'xTabs')]:
        if totals is None:
            # Old reports cannot recover scope overlap. Do not invent a total.
            result[key] = {'value': None, 'status': 'missing', 'data_through': report['observedAt'], 'sample_size': 0}
            continue
        if not isinstance(totals, list):
            raise ValueError('invalid growth daily totals')
        views = [row for row in totals if row['event'] == 'result_view']
        days = [row['day'] for row in views]
        if len(days) != len(set(days)):
            raise ValueError('duplicate growth daily total')
        values = [row[field] for row in views]
        if any(not isinstance(v, int) or isinstance(v, bool) or v < 0 for v in values):
            raise ValueError('invalid growth tab count')
        if any(row['xTabs'] > row['tabs'] for row in views):
            raise ValueError('X tabs exceed total tabs')
        result[key] = {'value': sum(values), 'status': 'ok', 'data_through': report['observedAt'], 'sample_size': len(views)}
    return result

def load_metrics(now):
    # Private exports stay outside Git and are bound to this product/domain/window.
    path = Path(os.environ.get('NPB_GROWTH_RECEIPT', str(Path.home() / '.config/npb-predictions/growth-receipt.json')))
    try:
        data = json.loads(path.read_text())
    except FileNotFoundError:
        return {}, {}
    if data.get('origin') != ORIGIN or data.get('window_days') != 28:
        raise ValueError('receipt origin/window mismatch')
    stamp = dt.datetime.fromisoformat(data['data_through'].replace('Z', '+00:00'))
    if stamp.tzinfo is None or stamp > now + dt.timedelta(minutes=5):
        raise ValueError('invalid/future receipt time')
    status = 'stale' if now - stamp > dt.timedelta(days=8) else 'ok'
    metrics = {}
    for key in METRICS:
        value = data.get('metrics', {}).get(key)
        source = data.get('sources', {}).get(key)
        valid = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and bool(source)
        metrics[key] = {'value': value if valid else None, 'status': status if valid else 'missing',
                        'data_through': data['data_through'], 'sample_size': 1 if valid else 0}
    # Publication stages require URLs to independently read back, never a local boolean.
    return metrics, data

def probe_routes(now):
    successes = 0
    for path in ['/', '/rankings?year=2026&league=central', '/resources']:
        try:
            request = urllib.request.Request(ORIGIN + path, headers={'User-Agent': 'NPB-Growth-Health/1.0'})
            with urllib.request.urlopen(request, timeout=15) as response:
                body = response.read(2_000_000).decode('utf-8')
                if response.status == 200 and '<html' in body and 'NPB' in body and 'error code: 1102' not in body:
                    successes += 1
        except (OSError, ValueError):
            pass
    return {'value': successes, 'status': 'ok', 'sample_size': 3, 'data_through': now.isoformat()}

def main():
    if sys.argv[1:] == ['check']:
        json.loads((Path(__file__).parents[2] / '.agents/goal-loop.json').read_text())
        print('measurement entrypoint readable; external metrics may be missing')
        return 0
    now = dt.datetime.now(dt.timezone.utc)
    metrics, private = load_metrics(now)
    if sys.argv[1:2] == ['evidence']:
        stage = sys.argv[2]
        record = private.get('publications', {}).get(stage, {})
        if stage == 'monetization':
            href = record.get('approved_href', '')
            if not href.startswith('https://') or not record.get('program_id') or not record.get('approval_ref'):
                print('pending: approved program/href/approval reference missing'); return 1
            with urllib.request.urlopen(ORIGIN + '/resources', timeout=15) as response:
                text = response.read(2_000_000).decode('utf-8')
            import html as html_module
            from html.parser import HTMLParser
            class Links(HTMLParser):
                matched = False
                def handle_starttag(self, tag, attrs):
                    row = dict(attrs)
                    if tag == 'a' and row.get('href') == href and 'sponsored' in row.get('rel', '').split():
                        self.matched = True
            parser = Links(); parser.feed(text)
            if not parser.matched or 'PR' not in html_module.unescape(re.sub('<[^>]+>', ' ', text)):
                print('pending: approved sponsored link and disclosure not publicly observed'); return 1
        else:
            raise ValueError('unknown evidence stage')
        print('observed: public ' + stage + ' read-back; revenue is measured separately')
        return 0
    for key in METRICS:
        metrics.setdefault(key, {'value': None, 'status': 'missing', 'data_through': now.isoformat(), 'sample_size': 0})
    token = os.environ.get('NPB_ADMIN_BEARER')
    if token:
        request = urllib.request.Request(ORIGIN + '/api/growth/events', headers={'Authorization': 'Bearer ' + token})
        with urllib.request.urlopen(request, timeout=15) as response:
            report = json.load(response)
        metrics.update(growth_events(report))
    metrics['public_result_routes'] = probe_routes(now)
    output = json.dumps({'goal_ref': 'npb-predictions', 'metrics': metrics}, ensure_ascii=False, sort_keys=True)
    print(json.dumps({'schema': 'evidence.v1', 'id': 'npb-growth-' + now.isoformat(),
                      'claim': 'Public HTTP response and externally sourced business metrics are separate',
                      'source_ref': 'public-http+npb-growth-reconciliation',
                      'reverify_command': 'python3 scripts/growth/measure.py', 'observed_at': now.isoformat(),
                      'output': output, 'output_hash': 'sha256:' + hashlib.sha256(output.encode()).hexdigest()}, ensure_ascii=False))
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, KeyError, TypeError, OSError) as error:
        print('measurement invalid: ' + str(error), file=sys.stderr)
        sys.exit(2)
