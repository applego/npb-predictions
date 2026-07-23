from __future__ import annotations

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {
    "loop.yaml": [
        "npb-product-recovery",
        "Do not claim revenue until a",
        "business-decision",
        "max_iterations: 7",
    ],
    "inputs/current-state.md": [
        "friend predictions and commentator",
        "zero\n  monetized links",
        "Revenue: provider dashboard",
    ],
}


def main() -> int:
    failures: list[str] = []
    for relative_path, required_text in REQUIRED.items():
        path = ROOT / relative_path
        if not path.is_file():
            failures.append(f"missing {relative_path}")
            continue
        content = path.read_text(encoding="utf-8")
        for text in required_text:
            if text not in content:
                failures.append(f"{relative_path}: missing {text!r}")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("NPB recovery loop source artifacts are structurally valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
