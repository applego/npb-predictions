import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("season-complete.py")


class CompletedSeasonTest(unittest.TestCase):
    def test_only_complete_final_season_stops_automatic_work(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            command = [sys.executable, str(SCRIPT), "--year", "2026", "--data", temp]
            def run():
                return subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(run().stdout, "completed=false\n")
            rows = [{"league": league, "rank": rank, "teamName": f"{league}-{rank}", "isFinal": True} for league in ("central", "pacific") for rank in range(1, 7)]
            path = folder / "public-results-2026.json"
            path.write_text(json.dumps({"version": 1, "year": 2026, "standings": rows}))
            self.assertEqual(run().stdout, "completed=true\n")
            for changed in [rows[:-1], [{**row, "isFinal": False} if i == 0 else row for i, row in enumerate(rows)], [{**row, "rank": 1} for row in rows]]:
                path.write_text(json.dumps({"version": 1, "year": 2026, "standings": changed}))
                self.assertEqual(run().stdout, "completed=false\n")
            path.write_text("invalid json")
            self.assertNotEqual(run().returncode, 0)


if __name__ == "__main__":
    unittest.main()
