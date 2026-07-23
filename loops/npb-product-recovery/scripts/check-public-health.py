from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROUTES = ("/", "/rankings/predictions", "/games/2026-05-20", "/resources")
MAX_LATENCY_SECONDS = 5.0


@dataclass(frozen=True)
class Result:
    route: str
    status: int
    elapsed: float
    error: str = ""


def fetch(base_url: str, route: str) -> Result:
    started = time.monotonic()
    request = Request(
        f"{base_url.rstrip('/')}{route}",
        headers={"User-Agent": "npb-product-recovery-health/1.0"},
    )
    try:
        with urlopen(request, timeout=MAX_LATENCY_SECONDS + 2) as response:
            response.read(1)
            return Result(route, response.status, time.monotonic() - started)
    except HTTPError as error:
        return Result(route, error.code, time.monotonic() - started, str(error))
    except URLError as error:
        return Result(route, 0, time.monotonic() - started, str(error.reason))


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: check-public-health.py <base-url>", file=sys.stderr)
        return 2
    base_url = sys.argv[1]
    with ThreadPoolExecutor(max_workers=len(ROUTES)) as executor:
        results = list(executor.map(lambda route: fetch(base_url, route), ROUTES))

    failures = []
    for result in results:
        print(f"{result.route}: status={result.status} latency={result.elapsed:.3f}s")
        if result.status < 200 or result.status >= 300:
            failures.append(f"{result.route} returned {result.status}: {result.error}")
        elif result.elapsed > MAX_LATENCY_SECONDS:
            failures.append(f"{result.route} exceeded {MAX_LATENCY_SECONDS:.1f}s")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
