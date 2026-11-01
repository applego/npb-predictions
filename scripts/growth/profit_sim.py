#!/usr/bin/env python3
"""12-month profit scenarios from stated assumptions. Output is a forecast, never a measured result.

A path whose unit value is unknown (null) is excluded and named, not counted as zero.
"""
import json
import sys
from pathlib import Path

DEFAULT_INPUT = Path(__file__).with_name('profit-sim.json')


def months(start):
    year, month = map(int, start.split('-'))
    for i in range(12):
        m = (month - 1 + i) % 12 + 1
        yield f'{year + (month - 1 + i) // 12}-{m:02d}', f'{m:02d}'


def per_visitor(path):
    """Yen per visitor in an active month, or None when any factor is unknown."""
    factors = [v for k, v in path.items() if isinstance(v, dict) and 'value' in v]
    if any(f['value'] is None for f in factors):
        return None
    total = 1.0
    for f in factors:
        total *= f['value']
    if 'yen_per_1000_pages' in path:
        total /= 1000
    return total


def simulate(data, scenario):
    base = data['base_visitors_per_month'][scenario]['value']
    season = data['season_factor']['value']
    rates = {name: per_visitor(p) for name, p in data['paths'].items()}
    known_costs = sum(c['value'] for c in data['costs_per_month'].values() if c['value'] is not None)
    rows = []
    for label, mm in months(data['start_month']):
        visitors = round(base * season[mm])
        revenue = {name: round(visitors * rate) if mm in data['paths'][name]['months'] else 0
                   for name, rate in rates.items() if rate is not None}
        rows.append({'month': label, 'visitors': visitors, 'revenue': revenue,
                     'profit': sum(revenue.values()) - known_costs})
    return {
        'scenario': scenario,
        'rows': rows,
        'total_revenue': {name: sum(r['revenue'][name] for r in rows) for name in rows[0]['revenue']},
        'total_profit': sum(r['profit'] for r in rows),
        'excluded_paths': [name for name, rate in rates.items() if rate is None],
        'excluded_costs': [name for name, c in data['costs_per_month'].items() if c['value'] is None],
    }


def main(argv):
    data = json.loads(Path(argv[1] if len(argv) > 1 else DEFAULT_INPUT).read_text())
    labels = {name: p['label'] for name, p in data['paths'].items()}
    for scenario in data['base_visitors_per_month']:
        result = simulate(data, scenario)
        print(f"## {scenario}: 基準 {data['base_visitors_per_month'][scenario]['value']:,}人/月")
        for row in result['rows']:
            parts = ' '.join(f"{labels[n]} {v:,}円" for n, v in row['revenue'].items())
            print(f"{row['month']} 来訪 {row['visitors']:,} | {parts} | 利益 {row['profit']:,}円")
        totals = ' '.join(f"{labels[n]} {v:,}円" for n, v in result['total_revenue'].items())
        print(f"12か月: {totals} | 利益 {result['total_profit']:,}円")
        print(f"計算から外したもの: 経路 {[labels[n] for n in result['excluded_paths']]} / 費用 {result['excluded_costs']}\n")


if __name__ == '__main__':
    main(sys.argv)
