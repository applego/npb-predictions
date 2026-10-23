import datetime as dt
import importlib.util
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('pdca.py')
spec = importlib.util.spec_from_file_location('npb_pdca', SCRIPT)
pdca = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pdca)
NOW = '2026-10-24T01:00:00+09:00'


class CycleTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.measurement = self.root/'measurement.json'
        self.tracker = self.root/'tracker.json'
        self.data = {'goal_ref': 'npb-predictions', 'metrics': {
            'public_result_routes': {'status': 'ok', 'value': 3, 'data_through': NOW},
            'contribution_profit_28d': {'status': 'missing', 'value': None}}}
        self.tasks = [{'id': 'npb-predictions-3lw.1', 'status': 'open', 'priority': 0,
                       'notes': 'growth_wait={"kind":"publication","resume":"approved PR release"}'},
                      {'id': 'npb-predictions-3lw.2', 'status': 'open', 'priority': 1}]

    def cli(self, command='daily', data=None, tasks=None):
        self.measurement.write_text(json.dumps(data if data is not None else self.data))
        self.tracker.write_text(json.dumps(tasks if tasks is not None else self.tasks))
        env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
        return subprocess.run([sys.executable, str(SCRIPT), command, '--measurement', str(self.measurement),
                               '--tracker', str(self.tracker), '--now', NOW, '--state-dir', str(self.root/'state'),
                               '--public-output', str(self.root/'public.json')],
                              env=env, capture_output=True, text=True)

    def test_missing_profit_and_publication_wait_do_not_block_ready_work(self):
        result = self.cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertIsNone(report['metrics']['contribution_profit_28d']['value'])
        self.assertEqual(report['D']['tracker_item'], 'npb-predictions-3lw.2')
        self.assertFalse(report['C']['profit_verified'])
        self.assertEqual(report['handoff']['delivery'], 'not_sent')
        self.assertIsNone(report['handoff']['acknowledged_by'])

    def test_duplicate_observation_does_not_append_history_but_ready_work_is_retained(self):
        self.assertEqual(self.cli().returncode, 0)
        before = (self.root/'state/history.jsonl').read_bytes()
        result = self.cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(json.loads(result.stdout)['changed'])
        self.assertTrue(json.loads(result.stdout)['D']['work_required'])
        self.assertEqual((self.root/'state/history.jsonl').read_bytes(), before)

    def test_identical_external_wait_returns_unchanged(self):
        tasks = self.tasks[:1]
        self.assertEqual(self.cli(tasks=tasks).returncode, 0)
        result = self.cli(tasks=tasks)
        self.assertEqual(json.loads(result.stdout)['result'], 'unchanged')

    def test_only_http_probe_timestamp_changes_are_not_new_outcomes(self):
        self.data['metrics']['public_result_routes']['data_through'] = '2026-10-23T14:00:00Z'
        self.assertEqual(self.cli(tasks=self.tasks[:1]).returncode, 0)
        self.data['metrics']['public_result_routes']['data_through'] = '2026-10-23T15:00:00Z'
        result = self.cli(tasks=self.tasks[:1])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['result'], 'unchanged')

    def test_event_capture_time_alone_is_not_a_delta_but_private_capture_stays_fresh(self):
        self.data['metrics']['x_share_starts_28d'] = {'status': 'ok', 'value': 9,
                                                    'data_through': '2026-10-23T14:00:00Z'}
        self.assertEqual(self.cli(tasks=self.tasks[:1]).returncode, 0)
        public = (self.root/'public.json').read_bytes()
        history = (self.root/'state/history.jsonl').read_bytes()
        self.data['metrics']['x_share_starts_28d']['data_through'] = '2026-10-23T15:00:00Z'
        result = self.cli(tasks=self.tasks[:1])
        self.assertEqual(json.loads(result.stdout)['result'], 'unchanged')
        self.assertEqual((self.root/'state/history.jsonl').read_bytes(), history)
        self.assertEqual((self.root/'public.json').read_bytes(), public)
        private = json.loads((self.root/'state/latest.json').read_text())
        self.assertEqual(private['metrics']['x_share_starts_28d']['data_through'], '2026-10-23T15:00:00Z')

    def test_projection_only_git_commit_does_not_manufacture_a_delta(self):
        experiments = pdca.read(pdca.ROOT/'scripts/growth/experiments.json')['experiments']
        args = [self.data, experiments, self.tasks, pdca.stamp(NOW), list(self.data['metrics'])]
        first = pdca.cycle(*args, head='a'*40)
        second = pdca.cycle(*args, head='b'*40)
        self.assertEqual(first['fingerprint'], second['fingerprint'])
        self.assertNotEqual(first['source_head'], second['source_head'])

    def test_failed_measurement_command_keeps_ready_work_and_explicit_nulls(self):
        self.tracker.write_text(json.dumps(self.tasks))
        calls = []
        def external(argv, cwd):
            calls.append(argv)
            if argv == [sys.executable, 'scripts/growth/measure.py']:
                raise ValueError('authentication or transport failed')
            if argv == ['git', 'rev-parse', 'HEAD']:
                return 'a'*40
            raise AssertionError('unexpected external command')
        out = io.StringIO()
        args = [str(SCRIPT), 'daily', '--tracker', str(self.tracker), '--now', NOW,
                '--state-dir', str(self.root/'state')]
        with patch.object(sys, 'argv', args), patch.object(pdca, 'run', external), contextlib.redirect_stdout(out):
            self.assertEqual(pdca.main(), 0)
        report = json.loads(out.getvalue())
        self.assertEqual(report['D']['tracker_item'], 'npb-predictions-3lw.2')
        self.assertEqual(report['collection_error'], 'measurement_unavailable')
        self.assertTrue(all(row['value'] is None for row in report['metrics'].values()))
        self.assertEqual(len(calls), 2)

    def test_deadline_alone_cannot_start_or_reject_an_experiment(self):
        result = self.cli('weekly')
        self.assertEqual(result.returncode, 0, result.stderr)
        checks = json.loads(result.stdout)['C']['experiments']
        self.assertTrue(all(row['verdict'] is None for row in checks))
        self.assertTrue(all(row['state'] == 'awaiting_publication_evidence' for row in checks))

    def test_invalid_subject_and_future_sources_fail_without_overwriting_state(self):
        self.assertEqual(self.cli().returncode, 0)
        before = (self.root/'state/latest.json').read_bytes()
        self.data['goal_ref'] = 'another-product'
        self.assertEqual(self.cli().returncode, 2)
        self.data['goal_ref'] = 'npb-predictions'
        self.data['metrics']['public_result_routes']['data_through'] = '2027-01-01T00:00:00Z'
        self.assertEqual(self.cli().returncode, 2)
        self.assertEqual((self.root/'state/latest.json').read_bytes(), before)

    def test_stale_value_remains_unknown(self):
        self.data['metrics']['public_result_routes']['data_through'] = '2026-10-01T00:00:00Z'
        result = self.cli()
        row = json.loads(result.stdout)['metrics']['public_result_routes']
        self.assertEqual(row['status'], 'stale')
        self.assertIsNone(row['value'])

    def test_shared_summary_excludes_private_values_urls_and_notes(self):
        self.data['metrics']['contribution_profit_28d'] = {'status': 'ok', 'value': 1234567, 'data_through': NOW,
                                                          'source': 'PRIVATE-INVOICE-URL'}
        self.tasks[1]['notes'] = 'PRIVATE-USER-NOTE'
        self.assertEqual(self.cli().returncode, 0)
        public = (self.root/'public.json').read_text()
        for secret in ['1234567', 'PRIVATE-INVOICE-URL', 'PRIVATE-USER-NOTE']:
            self.assertNotIn(secret, public)
        self.assertIsNone(json.loads(public)['metrics']['contribution_profit_28d']['value'])

    def test_unknown_wait_cannot_silently_hide_ready_work(self):
        self.tasks[0]['notes'] = 'growth_wait={"kind":"anything","resume":"later"}'
        result = self.cli()
        self.assertEqual(result.returncode, 2)
        self.assertIn('NPB_PDCA_SOURCE_INVALID', result.stderr)

    def test_observation_window_and_measurement_coverage_are_distinct(self):
        exp = {'id': 'fixture', 'published_at': '2026-10-20T00:00:00Z', 'publication_ref': 'public-build-sha',
               'window_days': 7, 'prediction': {'metric_ref': 'npb-predictions#x_share_starts_28d'}}
        now = dt.datetime(2026, 10, 24, tzinfo=dt.timezone.utc)
        self.assertEqual(pdca.experiment_check(exp, {}, now)['state'], 'observing')
        later = now + dt.timedelta(days=7)
        self.assertEqual(pdca.experiment_check(exp, {}, later)['state'], 'awaiting_measurement')


if __name__ == '__main__':
    unittest.main()
