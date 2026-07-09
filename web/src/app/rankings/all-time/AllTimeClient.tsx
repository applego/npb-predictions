"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Commentator {
  rank: number;
  userId: number;
  name: string;
  slug: string;
  source: string | null;
  yearsCount: number;
  allTimeCentral: number;
  allTimePacific: number;
  allTimeTotal: number;
  avgPerYear: number;
  bestScore: number;
  bestYear: number | null;
  avgDeviation: number | null;
}

type SortKey = "rank" | "years" | "avg" | "best" | "deviation" | "total";
type SortDir = "asc" | "desc";

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function getRankBadge(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return String(rank);
}

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "rank", label: "#", align: "left" },
  { key: "rank", label: "\u89E3\u8AAC\u8005", align: "left" },
  { key: "years", label: "\u53C2\u52A0\u5E74", align: "right" },
  { key: "avg", label: "\u5E73\u5747/\u5E74", align: "right" },
  { key: "best", label: "\u6700\u9AD8", align: "right" },
  { key: "deviation", label: "\u504F\u5DEE\u5024", align: "right" },
  { key: "total", label: "\u901A\u7B97", align: "right" },
];

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align: "left" | "right";
}) {
  const isActive = currentSort === sortKey;
  const arrow = isActive ? (currentDir === "desc" ? " \u25BC" : " \u25B2") : "";
  return (
    <th
      className={`px-3 py-2.5 text-xs font-medium ${align === "right" ? "text-right" : "text-left"}`}
      style={{
        fontFamily: "var(--font-display)",
        color: isActive ? "var(--stitch)" : "var(--text-muted)",
        letterSpacing: "0.1em",
        background: "var(--bg-inset)",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={() => onSort(sortKey)}
    >
      {label}{arrow}
    </th>
  );
}

export function AllTimeTable({ commentators }: { commentators: Commentator[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Find the all-time best single score
  const allTimeBest = useMemo(() => {
    let best = { score: -Infinity, name: "", year: 0 };
    for (const c of commentators) {
      if (c.bestScore > best.score) {
        best = { score: c.bestScore, name: c.name, year: c.bestYear ?? 0 };
      }
    }
    return best;
  }, [commentators]);

  const sorted = useMemo(() => {
    const arr = [...commentators];
    const dir = sortDir === "desc" ? -1 : 1;
    arr.sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case "years": va = a.yearsCount; vb = b.yearsCount; break;
        case "avg": va = a.avgPerYear; vb = b.avgPerYear; break;
        case "best": va = a.bestScore; vb = b.bestScore; break;
        case "deviation": va = a.avgDeviation ?? 0; vb = b.avgDeviation ?? 0; break;
        case "total": va = a.allTimeTotal; vb = b.allTimeTotal; break;
        default: va = a.rank; vb = b.rank; break;
      }
      return (va - vb) * dir;
    });
    return arr;
  }, [commentators, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {/* All-time best highlight */}
      {allTimeBest.score > -Infinity && (
        <div
          className="flex items-center gap-4 rounded-xl px-5 py-4"
          style={{
            background: "rgba(212,160,23,0.04)",
            border: "1px solid rgba(212,160,23,0.2)",
          }}
        >
          <span className="text-2xl">{"\u{1F3C6}"}</span>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
              単年最高
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--dirt)", lineHeight: 1.2 }}>
              {fmtScore(allTimeBest.score)}
            </p>
          </div>
          <div className="ml-2">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{allTimeBest.name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{allTimeBest.year}{"\u5E74"}</p>
          </div>
        </div>
      )}

      {/* Sortable table */}
      <div
        className="max-w-full overflow-x-auto rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
      >
        <table className="w-full min-w-[31rem] text-sm">
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-primary)" }}>
              <SortHeader label="#" sortKey="rank" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
              <th
                className="px-3 py-2.5 text-left text-xs font-medium"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-muted)", letterSpacing: "0.1em", background: "var(--bg-inset)" }}
              >
                {"\u89E3\u8AAC\u8005"}
              </th>
              <SortHeader label={"\u53C2\u52A0\u5E74"} sortKey="years" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
              <SortHeader label={"\u5E73\u5747/\u5E74"} sortKey="avg" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
              <SortHeader label={"\u6700\u9AD8"} sortKey="best" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
              <SortHeader label={"\u504F\u5DEE\u5024"} sortKey="deviation" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
              <SortHeader label={"\u901A\u7B97"} sortKey="total" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, idx) => {
              const isTop3 = idx < 3;
              const isBestEver = c.bestScore === allTimeBest.score && c.bestYear === allTimeBest.year;
              return (
                <tr
                  key={c.userId}
                  style={{
                    borderBottom: "1px solid var(--border-primary)",
                    background: isTop3 ? "rgba(212,160,23,0.02)" : "transparent",
                  }}
                >
                  <td className="px-3 py-2.5" style={{ fontFamily: "var(--font-display)", color: isTop3 ? "var(--dirt)" : "var(--text-muted)" }}>
                    {sortKey === "rank" || sortKey === "total" ? getRankBadge(idx + 1) : idx + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/commentators/${c.slug}`}
                      className="inline-flex min-h-9 min-w-10 items-center font-medium transition-colors hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {c.name}
                    </Link>
                    {c.source && (
                      <span className="ml-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {c.source}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: "var(--text-muted)" }}>
                    {c.yearsCount}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    color: c.avgPerYear > 0 ? "var(--field)" : c.avgPerYear < 0 ? "var(--stitch)" : "var(--text-muted)",
                  }}>
                    {c.avgPerYear > 0 ? `+${c.avgPerYear}` : c.avgPerYear}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{
                    fontFamily: "var(--font-display)",
                    color: isBestEver ? "var(--dirt)" : c.bestScore > 0 ? "var(--field)" : "var(--text-muted)",
                    fontWeight: isBestEver ? 900 : 400,
                  }}>
                    {fmtScore(c.bestScore)}
                    {c.bestYear && (
                      <span className="ml-0.5 text-[10px]" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                        ({c.bestYear})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{
                    fontFamily: "var(--font-display)",
                    color: c.avgDeviation && c.avgDeviation >= 55 ? "var(--field)" : c.avgDeviation && c.avgDeviation < 45 ? "var(--stitch)" : "var(--text-muted)",
                  }}>
                    {c.avgDeviation ?? "\u2014"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="inline-block rounded-sm px-2 py-0.5"
                      style={{
                        fontFamily: "var(--font-display)",
                        background: isTop3 ? "rgba(212,160,23,0.08)" : "var(--bg-elevated)",
                        color: c.allTimeTotal > 0 ? "var(--dirt)" : "var(--stitch)",
                        border: `1px solid ${isTop3 ? "rgba(212,160,23,0.2)" : "var(--border-primary)"}`,
                      }}
                    >
                      {fmtScore(c.allTimeTotal)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
