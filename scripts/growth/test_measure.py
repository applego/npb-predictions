import datetime as dt
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

PATH = Path(__file__).with_name('measure.py')
spec = importlib.util.spec_from_file_location('growth_measure', PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
NOW = dt.datetime(2026, 10, 21, tzinfo=dt.timezone.utc)

class EvidenceTests(unittest.TestCase):
    def load(self, payload):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'receipt.json'
            if payload is not None: path.write_text(json.dumps(payload))
            with patch.dict(os.environ, {'NPB_GROWTH_RECEIPT': str(path)}):
                return module.load_metrics(NOW)
    def receipt(self, **extra):
        return dict(origin=module.ORIGIN, window_days=28, data_through=NOW.isoformat(), **extra)
    def test_missing_stays_unknown(self):
        self.assertEqual(self.load(None), ({}, {}))
        metrics, _ = self.load(self.receipt(metrics={'contribution_profit_28d': 0}))
        self.assertIsNone(metrics['contribution_profit_28d']['value'])
    def test_sourced_zero_is_distinct_from_missing(self):
        metrics, _ = self.load(self.receipt(metrics={'contribution_profit_28d': 0}, sources={'contribution_profit_28d': 'asp-export-and-cost-reconciliation:fixture'}))
        self.assertEqual(metrics['contribution_profit_28d']['value'], 0)
        self.assertEqual(metrics['contribution_profit_28d']['status'], 'ok')
    def test_wrong_subject_future_and_nonfinite_fail_closed(self):
        for field, value in [('origin', 'https://example.com'), ('window_days', 7), ('data_through','2027-01-01T00:00:00+00:00')]:
            receipt = self.receipt();receipt[field] = value
            with self.assertRaises(ValueError): self.load(receipt)
        metrics, _ = self.load(self.receipt(metrics={'visitors_28d': float('nan')}, sources={'visitors_28d':'fixture'}))
        self.assertIsNone(metrics['visitors_28d']['value'])
    def test_cli_health_entrypoint(self):
        result = subprocess.run(['python3', str(PATH), 'check'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
    def test_publication_pointer_alone_cannot_pass(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'receipt.json';path.write_text(json.dumps(self.receipt(publications={'monetization':{'url':'https://example.com/offer'}})))
            result = subprocess.run(['python3',str(PATH),'evidence','monetization'],env={**os.environ,'NPB_GROWTH_RECEIPT':str(path)},capture_output=True,text=True)
            self.assertEqual(result.returncode,1)
            self.assertIn('pending', result.stdout)
if __name__ == '__main__': unittest.main()
