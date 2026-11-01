import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PATH = Path(__file__).with_name('profit_sim.py')
spec = importlib.util.spec_from_file_location('profit_sim', PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

ALL = [f'{m:02d}' for m in range(1, 13)]


def fixture(unknown_signup=True, agent_cost=None):
    return {
        'start_month': '2026-11',
        'base_visitors_per_month': {'s': {'value': 1000}},
        'season_factor': {'value': {m: (2.0 if m == '03' else 1.0) for m in ALL}},
        'paths': {
            'book': {'label': '本', 'months': ['03'],
                     'click_rate': {'value': 0.1}, 'yen_per_purchase': {'value': 50}},
            'ads': {'label': '広告', 'months': ALL,
                    'pages_per_visit': {'value': 2.0}, 'yen_per_1000_pages': {'value': 100}},
            'stream': {'label': '配信', 'months': ALL,
                       'yen_per_signup': {'value': None if unknown_signup else 1000}, 'signup_rate': {'value': 0.01}},
        },
        'costs_per_month': {'cf': {'value': 100}, 'agent': {'value': agent_cost}},
    }


class SimulateTests(unittest.TestCase):
    def test_hand_computed_year(self):
        r = module.simulate(fixture(), 's')
        # ads: 11 months x 1000 visitors x 2 pages x 0.1 yen + March 2000 x 0.2 = 2200+400
        self.assertEqual(r['total_revenue'], {'book': 10_000, 'ads': 2_600})
        march = next(row for row in r['rows'] if row['month'] == '2027-03')
        self.assertEqual((march['visitors'], march['revenue']['book']), (2000, 10_000))
        self.assertEqual(r['total_profit'], 12_600 - 12 * 100)

    def test_unknown_unit_value_is_excluded_not_zeroed(self):
        r = module.simulate(fixture(), 's')
        self.assertEqual(r['excluded_paths'], ['stream'])
        self.assertNotIn('stream', r['total_revenue'])
        self.assertEqual(r['excluded_costs'], ['agent'])
        known = module.simulate(fixture(unknown_signup=False, agent_cost=50), 's')
        # 11 months x 1000 x 1% x 1000 yen + March 2000 x 1% x 1000 yen
        self.assertEqual(known['total_revenue']['stream'], 110_000 + 20_000)
        self.assertEqual(known['excluded_costs'], [])

    def test_cli_names_what_it_left_out(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'sim.json'
            path.write_text(json.dumps(fixture()))
            out = subprocess.run([sys.executable, str(PATH), str(path)], capture_output=True, text=True, check=True).stdout
        self.assertIn('12か月: 本 10,000円 広告 2,600円 | 利益 11,400円', out)
        self.assertIn("経路 ['配信'] / 費用 ['agent']", out)

    def test_bundled_assumptions_run(self):
        out = subprocess.run([sys.executable, str(PATH)], capture_output=True, text=True, check=True).stdout
        self.assertEqual(out.count('12か月:'), 3)


if __name__ == '__main__':
    unittest.main()
