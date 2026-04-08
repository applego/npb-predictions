export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { ScoreboardResponse } from "@/lib/types";
import ShareButton from "@/components/ShareButton";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const DEFAULT_YEAR = new Date().getFullYear();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}): Promise<Metadata> {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
  return {
    title: `${year}年 スコアボード`,
    description: `${year}年NPB予想リーグ現在のスコアボード。各予想家の順位点・タイトル点・合計得点を確認。`,
    openGraph: {
      title: `${year}年 NPB予想リーグ スコアボード`,
      description: `${year}年プロ野球順位予想リーグ — 現在の順位表`,
      type: "website",
    },
    alternates: { canonical: `/standings?year=${year}` },
  };
}

async function getScoreboard(year: number): Promise<ScoreboardResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/seasons/${year}/current-scoreboard`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json() as Promise<ScoreboardResponse | null>;
  } catch {
    return null;
  }
}

function getRankDisplay(index: number) {
  if (index === 0) return { label: "🥇", amber: true };
  if (index === 1) return { label: "🥈", amber: false };
  if (index === 2) return { label: "🥉", amber: false };
  return { label: `${index + 1}`, amber: false };
}

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
  const data = await getScoreboard(year);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="leading-none"
            style={{
              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            CURRENT STANDINGS
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            {year}シーズン スコアボード
          </p>
        </div>
        <ShareButton type="scoreboard" year={year} />
      </div>

      {!data || data.scores.length === 0 ? (
        /* Empty state */
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "#0a1525", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p
            className="font-display mb-4 text-sm"
            style={{
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              letterSpacing: "0.1em",
            }}
          >
            NO SCORE DATA YET
          </p>
          <p className="mb-6 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Adminから順位データを登録してスコア再計算を実行してください。
          </p>
          <Link
            href="/admin"
            className="inline-block rounded px-5 py-2.5 text-sm font-medium transition-all"
            style={{
              border: "1px solid rgba(251,191,36,0.3)",
              background: "rgba(251,191,36,0.08)",
              color: "#fbbf24",
            }}
          >
            Admin へ →
          </Link>
        </div>
      ) : (
        <>
          {/* Scoreboard Table */}
          <div
            className="overflow-x-auto rounded-xl"
            style={{ background: "#0a1525", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["順位", "ユーザー", "順位点", "タイトル点", "合計"].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={`px-4 py-3 text-xs font-medium uppercase tracking-widest ${i >= 2 ? "text-right" : "text-left"}`}
                        style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em" }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {data.scores.map((entry, idx) => {
                  const { label, amber } = getRankDisplay(idx);
                  return (
                    <tr
                      key={entry.userId}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: amber ? "rgba(251,191,36,0.04)" : "transparent",
                      }}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3.5">
                        {amber ? (
                          <span
                            className="font-display text-base"
                            style={{
                              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                              color: "#fbbf24",
                            }}
                          >
                            {label}
                          </span>
                        ) : (
                          <span
                            className="font-display text-base"
                            style={{
                              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                              color: "rgba(255,255,255,0.4)",
                            }}
                          >
                            {label}
                          </span>
                        )}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/users/${entry.userId}?year=${year}`}
                          className="font-medium transition-colors hover:text-amber-400"
                          style={{ color: "rgba(255,255,255,0.8)" }}
                        >
                          {entry.userName}
                        </Link>
                      </td>

                      {/* Ranking score */}
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className="font-display tabular-nums text-base"
                          style={{
                            fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                            color:
                              entry.rankingScore > 0
                                ? "#fbbf24"
                                : entry.rankingScore < 0
                                ? "rgba(239,68,68,0.7)"
                                : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {fmtScore(entry.rankingScore)}
                        </span>
                      </td>

                      {/* Title score */}
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className="font-display tabular-nums text-base"
                          style={{
                            fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                            color:
                              entry.titleScore > 0
                                ? "#fbbf24"
                                : entry.titleScore < 0
                                ? "rgba(239,68,68,0.7)"
                                : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {fmtScore(entry.titleScore)}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className="inline-block rounded px-3 py-1 font-display text-base tabular-nums"
                          style={{
                            fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                            background: amber
                              ? "rgba(251,191,36,0.12)"
                              : "rgba(255,255,255,0.05)",
                            color: amber ? "#fbbf24" : "rgba(255,255,255,0.7)",
                            border: amber
                              ? "1px solid rgba(251,191,36,0.25)"
                              : "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {entry.totalScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Last Updated */}
          {data.scores[0]?.snapshotDate && (
            <p
              className="text-right text-xs"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Last updated:{" "}
              {new Date(data.scores[0].snapshotDate).toLocaleDateString("ja-JP")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
