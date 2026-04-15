export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

export const metadata: Metadata = {
  title: "通算ランキング | ALL-TIME RANKINGS",
  description: "プロ野球解説者の通算順位予想的中ランキング。2014年からの全年通算スコアで比較。",
};

interface YearScore {
  year: number;
  centralScore: number;
  pacificScore: number;
  totalScore: number;
}

interface Commentator {
  rank: number;
  userId: number;
  name: string;
  slug: string;
  source: string | null;
  variant: string | null;
  yearsCount: number;
  years: YearScore[];
  allTimeCentral: number;
  allTimePacific: number;
  allTimeTotal: number;
  avgPerYear: number;
}

interface AllTimeResponse {
  totalCommentators: number;
  availableYears: number[];
  commentators: Commentator[];
}

async function getAllTimeRankings(): Promise<AllTimeResponse | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/rankings/all-time`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<AllTimeResponse>;
  } catch {
    return null;
  }
}

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

export default async function AllTimeRankingsPage() {
  const data = await getAllTimeRankings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
              letterSpacing: "0.06em",
              color: "var(--text-primary)",
            }}
          >
            ALL-TIME <span style={{ color: "var(--stitch)" }}>RANKINGS</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            2014年からの通算スコアランキング — {data?.totalCommentators ?? 0}人
          </p>
        </div>
        <Link
          href="/rankings/commentators"
          className="rounded-sm px-3 py-1.5 text-xs font-medium"
          style={{
            fontFamily: "var(--font-display)",
            border: "1px solid var(--border-primary)",
            color: "var(--text-secondary)",
            letterSpacing: "0.1em",
          }}
        >
          YEARLY →
        </Link>
      </div>

      {!data || data.commentators.length === 0 ? (
        <div
          className="card rounded-lg p-10 text-center"
        >
          <p style={{ color: "var(--text-muted)" }}>ランキングデータがありません</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          <div className="grid gap-3 sm:grid-cols-3">
            {data.commentators.slice(0, 3).map((c) => {
              const isFirst = c.rank === 1;
              return (
                <Link
                  key={c.userId}
                  href={`/rankings/commentators/${c.slug}`}
                  className="card rounded-lg p-4 transition-all hover:shadow-md"
                  style={{
                    borderColor: isFirst ? "var(--dirt)" : "var(--border-primary)",
                    background: isFirst ? "rgba(212,160,23,0.04)" : "var(--bg-surface)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getRankBadge(c.rank)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {c.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {c.yearsCount}年参加 · 平均{c.avgPerYear}/年
                      </div>
                    </div>
                    <div
                      className="rounded-sm px-2.5 py-1 text-center"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.1rem",
                        background: isFirst ? "rgba(212,160,23,0.1)" : "var(--bg-elevated)",
                        color: c.allTimeTotal > 0 ? "var(--dirt)" : "var(--stitch)",
                        border: `1px solid ${isFirst ? "rgba(212,160,23,0.3)" : "var(--border-primary)"}`,
                      }}
                    >
                      {fmtScore(c.allTimeTotal)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Full table */}
          <div className="card overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-primary)" }}>
                  {["#", "解説者", "参加年", "セ", "パ", "通算", "平均/年"].map((col, i) => (
                    <th
                      key={col}
                      className={`px-3 py-2.5 text-xs font-medium ${i <= 1 ? "text-left" : "text-right"}`}
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--text-muted)",
                        letterSpacing: "0.1em",
                        background: "var(--bg-inset)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.commentators.map((c) => {
                  const isTop3 = c.rank <= 3;
                  return (
                    <tr
                      key={c.userId}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid var(--border-primary)",
                        background: isTop3 ? "rgba(212,160,23,0.02)" : "transparent",
                      }}
                    >
                      <td className="px-3 py-2.5" style={{ fontFamily: "var(--font-display)", color: isTop3 ? "var(--dirt)" : "var(--text-muted)" }}>
                        {getRankBadge(c.rank)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/rankings/commentators/${c.slug}`}
                          className="font-medium transition-colors hover:underline"
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
                        color: c.allTimeCentral > 0 ? "var(--field)" : c.allTimeCentral < 0 ? "var(--stitch)" : "var(--text-muted)",
                      }}>
                        {fmtScore(c.allTimeCentral)}
                      </td>
                      <td className="px-3 py-2.5 text-right" style={{
                        fontFamily: "var(--font-display)",
                        color: c.allTimePacific > 0 ? "var(--field)" : c.allTimePacific < 0 ? "var(--stitch)" : "var(--text-muted)",
                      }}>
                        {fmtScore(c.allTimePacific)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className="inline-block rounded-sm px-2 py-0.5"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            background: isTop3 ? "rgba(212,160,23,0.08)" : "var(--bg-elevated)",
                            color: c.allTimeTotal > 0 ? "var(--dirt)" : "var(--stitch)",
                            border: `1px solid ${isTop3 ? "rgba(212,160,23,0.2)" : "var(--border-primary)"}`,
                          }}
                        >
                          {fmtScore(c.allTimeTotal)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right" style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--text-muted)",
                      }}>
                        {c.avgPerYear}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Year breakdown sparklines legend */}
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            スコア計算: 完全一致 +5 / 1位差 +3 / 2位差 +1 / 3位差 -1 / 4位差 -3 / 5位差 -5
          </div>
        </>
      )}
    </div>
  );
}
