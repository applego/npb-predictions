#!/usr/bin/env python3
"""
Check deploy artifact performance budgets.

This is intentionally artifact-based instead of network-based so it is stable in
CI and can run before Cloudflare Pages deploys.
"""

from __future__ import annotations

import gzip
import os
from pathlib import Path
import sys


WEB_ROOT = Path(__file__).resolve().parents[1]
STATIC_ROOT = Path(os.environ.get("NPB_PERF_STATIC_ROOT", WEB_ROOT / ".vercel/output/static"))

CLIENT_ASSET_TOTAL_GZIP_BUDGET = int(os.environ.get("NPB_CLIENT_ASSET_TOTAL_GZIP_BUDGET", 700_000))
CLIENT_ASSET_MAX_GZIP_BUDGET = int(os.environ.get("NPB_CLIENT_ASSET_MAX_GZIP_BUDGET", 150_000))
DEPLOY_OUTPUT_TOTAL_GZIP_BUDGET = int(os.environ.get("NPB_DEPLOY_OUTPUT_TOTAL_GZIP_BUDGET", 3_200_000))
DEPLOY_OUTPUT_MAX_GZIP_BUDGET = int(os.environ.get("NPB_DEPLOY_OUTPUT_MAX_GZIP_BUDGET", 320_000))


def gzip_size(path: Path) -> int:
    return len(gzip.compress(path.read_bytes(), compresslevel=9))


def collect_assets(root: Path, prefix: str | None = None) -> list[tuple[int, int, Path]]:
    assets: list[tuple[int, int, Path]] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in {".js", ".css", ".html"}:
            continue
        rel = path.relative_to(root).as_posix()
        if prefix and not rel.startswith(prefix):
            continue
        assets.append((gzip_size(path), path.stat().st_size, path))
    return assets


def report_group(name: str, assets: list[tuple[int, int, Path]]) -> None:
    total_gzip = sum(gzip_bytes for gzip_bytes, _, _ in assets)
    total_raw = sum(raw_bytes for _, raw_bytes, _ in assets)
    max_gzip, max_raw, max_path = max(assets, default=(0, 0, STATIC_ROOT))
    rel = max_path.relative_to(STATIC_ROOT).as_posix() if max_path != STATIC_ROOT else "n/a"
    print(
        f"{name}: files={len(assets)} raw={total_raw} gzip={total_gzip} "
        f"max_gzip={max_gzip} max_raw={max_raw} max_file={rel}"
    )


def check(condition: bool, message: str, errors: list[str]) -> None:
    if condition:
        print(f"  [OK] {message}")
    else:
        print(f"  [FAIL] {message}")
        errors.append(message)


def main() -> int:
    if not STATIC_ROOT.exists():
        print(f"Missing deploy output: {STATIC_ROOT}", file=sys.stderr)
        print("Run `npm run build:cf` before `npm run check:perf-budget`.", file=sys.stderr)
        return 1

    deploy_assets = collect_assets(STATIC_ROOT)
    client_assets = collect_assets(STATIC_ROOT, "_next/static/")
    errors: list[str] = []

    print(f"Using deploy output: {STATIC_ROOT}")
    report_group("client _next/static", client_assets)
    report_group("deploy output", deploy_assets)

    client_total_gzip = sum(gzip_bytes for gzip_bytes, _, _ in client_assets)
    client_max_gzip = max((gzip_bytes for gzip_bytes, _, _ in client_assets), default=0)
    deploy_total_gzip = sum(gzip_bytes for gzip_bytes, _, _ in deploy_assets)
    deploy_max_gzip = max((gzip_bytes for gzip_bytes, _, _ in deploy_assets), default=0)

    check(
        client_total_gzip <= CLIENT_ASSET_TOTAL_GZIP_BUDGET,
        f"client gzip total <= {CLIENT_ASSET_TOTAL_GZIP_BUDGET} bytes",
        errors,
    )
    check(
        client_max_gzip <= CLIENT_ASSET_MAX_GZIP_BUDGET,
        f"client largest asset gzip <= {CLIENT_ASSET_MAX_GZIP_BUDGET} bytes",
        errors,
    )
    check(
        deploy_total_gzip <= DEPLOY_OUTPUT_TOTAL_GZIP_BUDGET,
        f"deploy output gzip total <= {DEPLOY_OUTPUT_TOTAL_GZIP_BUDGET} bytes",
        errors,
    )
    check(
        deploy_max_gzip <= DEPLOY_OUTPUT_MAX_GZIP_BUDGET,
        f"deploy largest asset gzip <= {DEPLOY_OUTPUT_MAX_GZIP_BUDGET} bytes",
        errors,
    )

    if errors:
        print(f"FAILED: {len(errors)} budget violation(s)")
        return 1

    print("ALL PERFORMANCE BUDGETS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
