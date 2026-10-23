#!/usr/bin/env python3
"""NPB adapter: one measurement, finite PDCA, tracker work, safe shared projection.

No model, deploy, database write, message or business approval is executed here.
The existing Codex automation executes D; br remains the work/ownership source.
"""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
GOAL = 'npb-predictions'
PRIMARY = 'contribution_profit_28d'
PUBLIC_METRICS = {'public_result_routes'}


def stamp(value):
    result = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('timestamp requires timezone')
    return result


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, allow_nan=False).encode()).hexdigest()


def read(path):
    return json.loads(path.read_text(), parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite JSON')))


def run(argv, cwd):
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    result = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise ValueError('source command failed: ' + argv[0])
    return result.stdout


def atomic(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, name = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write('\n')
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def measurements(raw, now, metric_ids):
    if raw.get('schema') == 'evidence.v1':
        output = raw['output']
        if raw.get('output_hash') != 'sha256:' + hashlib.sha256(output.encode()).hexdigest():
            raise ValueError('measurement hash mismatch')
        raw = json.loads(output)
    if raw.get('goal_ref') != GOAL or not isinstance(raw.get('metrics'), dict):
        raise ValueError('measurement subject mismatch')
    result = {}
    for key in metric_ids:
        row = raw['metrics'].get(key, {})
        value = row.get('value')
        valid = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
        status = row.get('status', 'missing')
        if status not in {'ok', 'missing', 'stale'}:
            raise ValueError('invalid measurement status')
        if status == 'ok' and valid:
            through = stamp(row['data_through'])
            if through > now + dt.timedelta(minutes=5):
                raise ValueError('future measurement')
            if now - through > dt.timedelta(days=8):
                status = 'stale'
        else:
            status = 'missing' if status == 'ok' else status
        result[key] = {'status': status, 'value': value if valid and status == 'ok' else None,
                       'data_through': row.get('data_through') if status == 'ok' else None}
    return result


def experiment_check(exp, metrics, now):
    # A deadline and a published UI are not proof of assignment/exposure or success.
    published = exp.get('published_at')
    metric = exp['prediction']['metric_ref'].split('#')[-1]
    if not published or not exp.get('publication_ref'):
        return {'id': exp['id'], 'state': 'awaiting_publication_evidence', 'verdict': None,
                'reason': 'actual publication time/ref and comparable measurement are required'}
    start = stamp(published)
    if start > now:
        raise ValueError('future publication')
    end = start + dt.timedelta(days=exp['window_days'])
    if now < end:
        state = 'observing'
    elif metrics.get(metric, {}).get('status') != 'ok' or stamp(metrics[metric]['data_through']) < end:
        state = 'awaiting_measurement'
    else:
        state = 'ready_for_review'
    return {'id': exp['id'], 'state': state, 'window_end': end.isoformat(), 'verdict': None,
            'reason': 'compare predeclared conditions; before/after data alone does not prove causality'}


def select_work(tasks, exclude):
    rows = []
    for task in tasks:
        if task.get('status') not in {'open', 'in_progress'} or task['id'] == exclude:
            continue
        wait = None
        match = re.search(r'^growth_wait=(\{[^\n]+\})$', task.get('notes') or '', re.M)
        if match:
            wait = json.loads(match[1])
            if wait.get('kind') not in {'auth', 'publication', 'observation', 'quota', 'live_owner'} or not wait.get('resume'):
                raise ValueError('wait needs a valid boundary and resume condition')
        rows.append({'id': task['id'], 'priority': task.get('priority', 2),
                     'state': 'waiting' if wait else 'ready', 'wait': wait})
    rows.sort(key=lambda row: (row['state'] != 'ready', row['priority'], row['id']))
    return rows, next((row['id'] for row in rows if row['state'] == 'ready'), None)


def cycle(raw, experiments, tasks, now, metric_ids, head, exclude=None):
    metrics = measurements(raw, now, metric_ids)
    checks = [experiment_check(exp, metrics, now) for exp in experiments]
    rows, selected = select_work(tasks, exclude)
    ranked = sorted(experiments, key=lambda exp: (-math.prod(exp['ice'].values()), exp['id']))
    # Experiments on the same surface remain serialized while any observation is unjudged.
    surfaces = [exp['surface'] for exp in experiments if exp.get('verdict') is None]
    missing = [key for key, value in metrics.items() if value['status'] != 'ok']
    report = {'schema': 'npb-growth-pdca.v1', 'goal_ref': GOAL, 'source_head': head,
              'observed_at': now.isoformat(), 'metrics': metrics,
              'P': {'primary': PRIMARY, 'target_status': 'provisional',
                    'ranked_experiments': [exp['id'] for exp in ranked], 'blocked_surfaces': sorted(set(surfaces))},
              'D': {'tracker_item': selected, 'work_required': selected is not None,
                    'queue': rows, 'executor': 'existing npb Codex automation', 'automatic_publication': False},
              'C': {'experiments': checks, 'profit_verified': False, 'causal_effect': None},
              'Adjust': {'reason': 'measurement_missing' if missing else 'compare_predeclared_hypotheses',
                         'missing': missing, 'next': 'execute_ready_tracker_work_and_restore_sources' if selected else 'wait_for_recorded_resume_trigger'},
              'handoff': {'delivery': 'not_sent', 'acknowledged_by': None}}
    fingerprint = {key: report[key] for key in ['source_head', 'P', 'D', 'C', 'Adjust']}
    fingerprint['metrics'] = {key: {field: value for field, value in row.items()
                                   if key not in PUBLIC_METRICS or field != 'data_through'}
                              for key, row in metrics.items()}
    report['fingerprint'] = digest(fingerprint)
    return report


def public_projection(report):
    # Explicit allowlist: never publish receipt values, source URLs, notes, tokens or private exports.
    return {'schema': report['schema'], 'goal_ref': GOAL, 'source_head': report['source_head'],
            'observed_at': report['observed_at'], 'fingerprint': report['fingerprint'],
            'metrics': {key: {'status': row['status'], 'value': row['value'] if key in PUBLIC_METRICS else None}
                        for key, row in report['metrics'].items()},
            'selected_tracker_item': report['D']['tracker_item'],
            'work_required': report['D']['work_required'],
            'experiments': report['C']['experiments'], 'profit_verified': False,
            'handoff': {'delivery': 'not_sent', 'acknowledged_by': None}}


def goal_graph(report):
    links = [('result_views_28d', 'x_share_starts_28d'), ('result_views_28d', 'card_downloads_28d'),
             ('x_share_starts_28d', 'x_result_tabs_28d'), ('card_downloads_28d', 'x_result_tabs_28d'),
             ('x_result_tabs_28d', 'affiliate_confirmed_28d'), ('affiliate_confirmed_28d', PRIMARY)]
    return {'schema': 'npb-growth-graph.v1', 'goal_ref': GOAL, 'source_head': report['source_head'],
            'nodes': [{'id': key, 'status': row['status'], 'value': row['value']} for key, row in report['metrics'].items()],
            'edges': [{'from': start, 'to': end, 'relation': 'hypothesis', 'causal_effect': None} for start, end in links],
            'unmeasured': ['repeat_visits', 'completed_x_posts'],
            'warning': 'daily anonymous tabs are not people; share/save starts are not completed posts or profit'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['daily', 'weekly', 'status', 'graph', 'levers', 'hypotheses'])
    parser.add_argument('--measurement', type=Path)
    parser.add_argument('--tracker', type=Path)
    parser.add_argument('--tracker-repo', type=Path, default=ROOT)
    parser.add_argument('--state-dir', type=Path, default=Path(os.environ.get('NPB_PDCA_HOME', str(Path.home()/'.local/state/npb-predictions/growth'))))
    parser.add_argument('--public-output', type=Path)
    parser.add_argument('--exclude-item')
    parser.add_argument('--now')
    args = parser.parse_args()
    exps = read(ROOT/'scripts/growth/experiments.json')['experiments']
    if args.command == 'levers':
        print(json.dumps({'schema': 'goal-levers.v1', 'levers': [
            {'id': exp['id'], 'name': exp['statement'], 'kind': 'outcome', 'role': 'hypothesis',
             'area': exp['surface'], 'paths': ['web/src/components/ResultsBoard.tsx'] if exp['id'] == 'results-x-01' else ['web/src/app/resources/**'],
             'experiments': [exp['id']], 'origin': 'owner_feedback',
             'budget': {'runs': 1, 'days': exp['window_days']}}
            for exp in exps], 'not_levers': []}, ensure_ascii=False))
        return 0
    if args.command == 'hypotheses':
        for exp in exps:
            print(json.dumps({'id': exp['id'], 'change': exp['variable'], 'expect': exp['statement'],
                              'check_at': exp['due']+'T23:59:59+09:00', 'metric': exp['prediction']['metric_ref'], 'verdict': exp['verdict']}, ensure_ascii=False))
        return 0
    if args.command in {'status', 'graph'}:
        value = read(args.state_dir/'latest.json')
        print(json.dumps(goal_graph(value) if args.command == 'graph' else value, ensure_ascii=False))
        return 0
    if (Path.home()/'.config/npb-predictions/goal-loop.stop').exists():
        print(json.dumps({'result': 'owner_stopped', 'work_required': False}))
        return 0
    now = stamp(args.now) if args.now else dt.datetime.now(dt.timezone.utc)
    metric_ids = re.findall(r'^  - id: ([a-z0-9_]+)$', (ROOT/'GOAL.md').read_text(), re.M)
    if args.measurement:
        raw = read(args.measurement)
    elif args.command == 'weekly':
        # Reuse the captured daily receipt; never collect twice for P vs C.
        raw = {'goal_ref': GOAL, 'metrics': read(args.state_dir/'latest.json')['metrics']}
    else:
        raw = json.loads(run([sys.executable, 'scripts/growth/measure.py'], ROOT))
    data = read(args.tracker) if args.tracker else json.loads(run(['br', 'list', '--status', 'open', '--json'], args.tracker_repo))
    tasks = data if isinstance(data, list) else data['issues']
    head = run(['git', 'rev-parse', 'HEAD'], ROOT).strip()
    report = cycle(raw, exps, tasks, now, metric_ids, head, args.exclude_item)
    args.state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (args.state_dir/'cycle.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        last = args.state_dir/'latest.json'
        previous = read(last) if last.exists() else None
        changed = previous is None or previous['fingerprint'] != report['fingerprint']
        report['changed'] = changed
        report['result'] = 'work_ready' if report['D']['work_required'] else 'changed' if changed else 'unchanged'
        report['cadence'] = args.command
        if changed:
            atomic(last, report)
            atomic(args.state_dir/'graph.json', goal_graph(report))
            with (args.state_dir/'history.jsonl').open('a') as history:
                history.write(json.dumps(report, ensure_ascii=False, allow_nan=False)+'\n')
        if args.public_output:
            atomic(args.public_output, public_projection(report))
    print(json.dumps(report, ensure_ascii=False, allow_nan=False))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, KeyError, TypeError, OSError, subprocess.SubprocessError):
        print('NPB_PDCA_SOURCE_INVALID', file=sys.stderr)
        sys.exit(2)
