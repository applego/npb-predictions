import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest

COLLECT = Path(__file__).with_name('collect.py')
MEASURE = Path(__file__).with_name('measure.py')

# Fake npx at the process boundary: answers each SELECT by the table/event it names, fails on anything else.
FAKE_NPX = r'''#!/usr/bin/env python3
import json, sys
sql = sys.argv[sys.argv.index("--command") + 1]
assert sys.argv[1:7] == ["--no-install", "wrangler", "d1", "execute", "npb-predictions", "--remote"], sys.argv
if "x_share_start" in sql:
    sys.exit(1)  # this metric's query fails: it must stay missing, not 0
value = 7 if "result_view" in sql else 2 if "affiliate_clicks" in sql else 0
print(json.dumps([{"results": [{"v": value}]}]))
'''


class CollectTests(unittest.TestCase):
    def run_collect(self, previous=None):
        folder = Path(tempfile.mkdtemp())
        (folder / 'npx').write_text(FAKE_NPX)
        (folder / 'npx').chmod(0o755)
        receipt = folder / 'receipt.json'
        if previous is not None:
            receipt.write_text(json.dumps(previous))
        env = {**os.environ, 'PATH': f'{folder}{os.pathsep}{os.environ["PATH"]}', 'NPB_GROWTH_RECEIPT': str(receipt)}
        out = subprocess.run([sys.executable, str(COLLECT)], env=env, capture_output=True, text=True, timeout=60)
        return out, receipt, env

    def test_measured_metrics_reach_measure_and_failed_or_unsourced_ones_stay_missing(self):
        out, receipt, env = self.run_collect()
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(stat.S_IMODE(receipt.stat().st_mode), 0o600)
        measured = subprocess.run([sys.executable, str(MEASURE)], env=env, capture_output=True, text=True, timeout=60)
        metrics = json.loads(json.loads(measured.stdout)['output'])['metrics']
        self.assertEqual(metrics['result_views_28d']['value'], 7)
        self.assertEqual(metrics['card_downloads_28d']['value'], 0)  # a sourced zero is a measurement
        self.assertEqual(metrics['affiliate_clicks_28d']['value'], 2)
        self.assertEqual(metrics['x_share_starts_28d']['status'], 'missing')
        self.assertEqual(metrics['contribution_profit_28d']['status'], 'missing')

    def test_reconciled_values_from_other_sources_are_kept(self):
        previous = {'origin': 'https://npb-predictions.pages.dev', 'window_days': 28, 'data_through': '2026-10-30T00:00:00+00:00',
                    'metrics': {'contribution_profit_28d': 0, 'result_views_28d': 99},
                    'sources': {'contribution_profit_28d': 'reconcile:2026-10', 'result_views_28d': 'old'}}
        out, receipt, _ = self.run_collect(previous)
        self.assertEqual(out.returncode, 0, out.stderr)
        data = json.loads(receipt.read_text())
        self.assertEqual(data['metrics']['contribution_profit_28d'], 0)
        self.assertEqual(data['sources']['contribution_profit_28d'], 'reconcile:2026-10')
        self.assertEqual(data['metrics']['result_views_28d'], 7)


if __name__ == '__main__':
    unittest.main()
