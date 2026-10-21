#!/usr/bin/env python3
"""ui-gate: docs/ui/scenarios.yaml の必須シナリオが、今の SHA で、実際に走って通ったかを判定する。

GitHub の required check は skipped / neutral でも通ってしまう。e2e job が条件で飛んだ、
0件しか走らなかった、シナリオに対応するテストが消えた・skip された、を全部「失敗」に倒すため、
always-run の最終 job でこれを1回だけ実行する（雛形: templates/ui-gate.yml）。

  python3 ui-gate.py --scenarios docs/ui/scenarios.yaml --report ui-report/results.json \
      --sha-file ui-report/sha --expect-sha "$GITHUB_SHA" [--tier pr|nightly]

report は Playwright の JSON reporter（.json）か JUnit XML（.xml）。--report は複数指定できる。
シナリオの test_id は、テストのタイトルか、describe を含むフルタイトル（" > " 区切り）と完全一致させる。

exit 0 = 全必須シナリオが通過 / 1 = gate 不合格 / 2 = scenarios.yaml の形が不正・読めない。
外部コマンド・ネットワークは使わない。scenarios.yaml が JSON でなければ PyYAML を使う。
"""

from __future__ import annotations

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SCHEMA_VERSION = 2
REQUIRED_KEYS = ("id", "question", "role", "route", "fixture", "test_id", "expected_outcome",
                 "max_operations")
TIERS = ("pr", "nightly")
V1_HINT = ("version 1 の scenarios.yaml です。start_url → route、expected_answer → expected_outcome に"
           "改名し、role と test_id を足して version: 2 にしてください")


class SchemaError(Exception):
    pass


def load_scenarios(path: Path) -> list:
    text = path.read_text(encoding="utf-8")
    try:
        doc = json.loads(text)
    except ValueError:
        try:
            import yaml  # type: ignore
        except ImportError:
            raise SchemaError("PyYAML がありません（pip install pyyaml）。または JSON 形式で書いてください")
        try:
            doc = yaml.safe_load(text)
        except yaml.YAMLError as exc:
            raise SchemaError("YAML として読めません: %s" % exc)
    if not isinstance(doc, dict):
        raise SchemaError("最上位は mapping（version / scenarios）にしてください")
    if doc.get("version") == 1:
        raise SchemaError(V1_HINT)
    if doc.get("version") != SCHEMA_VERSION:
        raise SchemaError("version は %d にしてください（現在: %r）" % (SCHEMA_VERSION, doc.get("version")))
    scenarios = doc.get("scenarios")
    if not isinstance(scenarios, list) or not scenarios:
        raise SchemaError("scenarios は1件以上の list にしてください")
    errors = []
    seen = {"id": set(), "test_id": set()}
    for i, sc in enumerate(scenarios):
        where = "scenarios[%d]" % i
        if not isinstance(sc, dict):
            errors.append("%s: mapping ではありません" % where)
            continue
        where = "scenarios[%d] (%s)" % (i, sc.get("id", "?"))
        for key in REQUIRED_KEYS:
            if key not in sc:
                errors.append("%s: %s がありません" % (where, key))
        for key in ("id", "question", "role", "route", "fixture", "test_id", "expected_outcome"):
            if key in sc and (not isinstance(sc[key], str) or not sc[key].strip()):
                errors.append("%s: %s は空でない文字列にしてください" % (where, key))
        route = sc.get("route")
        if isinstance(route, str) and route and not route.startswith(("/", "http://", "https://")):
            errors.append("%s: route は / か http(s):// で始めてください" % where)
        ops = sc.get("max_operations")
        if "max_operations" in sc and (isinstance(ops, bool) or not isinstance(ops, int) or ops < 1):
            errors.append("%s: max_operations は1以上の整数にしてください" % where)
        if sc.get("tier", "pr") not in TIERS:
            errors.append("%s: tier は %s のどれかにしてください" % (where, " / ".join(TIERS)))
        if not isinstance(sc.get("required", True), bool):
            errors.append("%s: required は true / false にしてください" % where)
        for key in ("id", "test_id"):
            value = sc.get(key)
            if isinstance(value, str):
                if value in seen[key]:
                    errors.append("%s: %s %r が重複しています" % (where, key, value))
                seen[key].add(value)
    if errors:
        raise SchemaError("\n".join(errors))
    return scenarios


def _playwright_results(doc: dict) -> dict:
    """{タイトル or フルタイトル: [status, ...]}。status は passed / skipped / failed / flaky。"""
    out = {}

    def walk(suite: dict, trail: list) -> None:
        title = suite.get("title") or ""
        here = trail + ([title] if title and not title.endswith((".ts", ".js", ".tsx", ".mjs")) else [])
        for spec in suite.get("specs") or []:
            for test in spec.get("tests") or []:
                results = test.get("results") or []
                status = test.get("status")
                if not results or status == "skipped":
                    verdict = "skipped"
                elif status == "expected":
                    verdict = "passed"
                elif status == "flaky":
                    verdict = "flaky"
                else:
                    verdict = "failed"
                for key in {spec.get("title") or "", " > ".join(here + [spec.get("title") or ""])}:
                    out.setdefault(key, []).append(verdict)
        for child in suite.get("suites") or []:
            walk(child, here)

    for suite in doc.get("suites") or []:
        walk(suite, [])
    return out


def _junit_results(root: ET.Element) -> dict:
    out = {}
    for case in root.iter("testcase"):
        name = case.get("name") or ""
        if case.find("skipped") is not None:
            verdict = "skipped"
        elif case.find("failure") is not None or case.find("error") is not None:
            verdict = "failed"
        else:
            verdict = "passed"
        keys = {name}
        if case.get("classname"):
            keys.add("%s > %s" % (case.get("classname"), name))
        for key in keys:
            out.setdefault(key, []).append(verdict)
    return out


def load_results(path: Path) -> dict:
    if path.suffix.lower() == ".xml":
        return _junit_results(ET.parse(str(path)).getroot())
    return _playwright_results(json.loads(path.read_text(encoding="utf-8")))


def gate(scenarios: list, results: dict, tier: str) -> list:
    failures = []
    ran = sum(1 for verdicts in results.values() for v in verdicts if v != "skipped")
    if ran == 0:
        failures.append("テストが1件も実行されていません（0 tests ran）")
    for sc in scenarios:
        if not sc.get("required", True):
            continue
        if tier == "pr" and sc.get("tier", "pr") != "pr":
            continue
        verdicts = results.get(sc["test_id"])
        label = "%s (test_id=%s)" % (sc["id"], sc["test_id"])
        if not verdicts:
            failures.append("%s: 対応するテストが report にありません（消えた / 名前が違う / 実行されなかった）" % label)
        elif "failed" in verdicts:
            failures.append("%s: 失敗しました" % label)
        elif all(v == "skipped" for v in verdicts):
            failures.append("%s: skip されました（skip は通過ではありません）" % label)
    return failures


def main(argv: list) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--scenarios", required=True, type=Path)
    ap.add_argument("--report", action="append", default=[], type=Path)
    ap.add_argument("--sha-file", type=Path, help="e2e job がテスト実行時に書いた SHA")
    ap.add_argument("--expect-sha", help="今の SHA（GitHub Actions なら $GITHUB_SHA）")
    ap.add_argument("--tier", choices=TIERS, default="pr")
    args = ap.parse_args(argv)

    try:
        scenarios = load_scenarios(args.scenarios)
    except (OSError, SchemaError) as exc:
        print("ui-gate: scenarios.yaml が不正です:\n%s" % exc, file=sys.stderr)
        return 2

    failures = []
    if args.expect_sha:
        try:
            got = args.sha_file.read_text(encoding="utf-8").strip() if args.sha_file else ""
        except OSError:
            got = ""
        if got != args.expect_sha:
            failures.append("report が今の SHA のものではありません（期待 %s / report %s）"
                            % (args.expect_sha, got or "なし"))
    results = {}
    if not args.report:
        failures.append("--report がありません")
    for path in args.report:
        try:
            for key, verdicts in load_results(path).items():
                results.setdefault(key, []).extend(verdicts)
        except (OSError, ValueError, ET.ParseError) as exc:
            failures.append("report を読めません: %s (%s)" % (path, exc))
    failures.extend(gate(scenarios, results, args.tier))

    if failures:
        print("ui-gate: FAIL", file=sys.stderr)
        for line in failures:
            print("  - " + line, file=sys.stderr)
        return 1
    counted = [sc for sc in scenarios if sc.get("required", True)
               and (args.tier == "nightly" or sc.get("tier", "pr") == "pr")]
    print("ui-gate: PASS（必須シナリオ %d 件 / tier=%s）" % (len(counted), args.tier))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
