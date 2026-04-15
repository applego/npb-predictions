export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import { getSeasons, getScoreboardData } from "@/lib/scoreboard";

const CURRENT_YEAR = new Date().getFullYear();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}): Promise<Metadata> {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : CURRENT_YEAR;
  const isCurrent = year >= CURRENT_YEAR;
  return {
    title: isCurrent ? `${year}年 スコアボード` : `${year}年 最終スコアボード`,
    description: `${year}年NPB予想リーグのスコアボード。各予想家の順位点・合計得点を確認。`,
    alternates: { canonical: `/standings?year=${year}` },
  };
}

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function getRankDisplay(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : CURRENT_YEAR;
  const [data, allSeasons] = await Promise.all([
    getScoreboardData(year),
    getSeasons(),
  ]);

  const isCurrent = year >= CURRENT_YEAR;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              letterSpacing: "0.04em",
              color: "var(--text-primary)",
            }}
          >
            <span style={{ color: "var(--stitch)" }}>{year}</span>{" "}
            {isCurrent ? "STANDINGS" : "FINAL STANDINGS"}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {isCurrent ? "シーズン進行中" : `${year}年シーズン確定結果`}
            {data && ` — ${data.scores.length}人`}
          </p>
        </div>
        <ShareButton type="scoreboard" year={year} />
      </div>

      {/* Year selector */}
      {allSeasons.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {allSeasons
            .sort((a, b) => b.year - a.year)
            .map((s) => (
              <Link
                key={s.year}
                href={`/standings?year=${s.year}`}
                className="rounded-sm px-3 py-2 text-xs font-medium"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.06em",
                  background: s.year === year ? "var(--stitch)" : "var(--bg-surface)",
                  color: s.year === year ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${s.year === year ? "var(--stitch)" : "var(--border-primary)"}`,
                }}
              >
                {s.year}
              </Link>
            ))}
        </div>
      )}

      {/* Scoreboard */}
      {!data || data.scores.length === 0 ? (
        <div className="card rounded-lg p-10 text-center">
          <p style={{ color: "var(--text-muted)" }}>
            {isCurrent
              ? `${year}シーズンはまだ結果が確定していません`
              : `${year}年のスコアデータがありません`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href={`/predictions?year=${year}`}
              className="rounded-sm px-4 py-2 text-sm"
              style={{ border: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}
            >
              {year}年の予想を見る
            </Link>
            <Link
              href="/rankings/commentators"
              className="rounded-sm px-4 py-2 text-sm"
              style={{ border: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}
            >
              解説者ランキング
            </Link>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-primary)" }}>
                {["#", "予想者", "順位点", "タイトル点", "合計"].map((col, i) => (
                  <th
                    key={col}
                    className={`px-3 py-2.5 text-xs font-medium ${i >= 2 ? "text-right" : "text-left"}`}
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
              {data.scores.map((entry, idx) => {
                const isTop3 = idx < 3;
                return (
                  <tr
                    key={entry.userId}
                    style={{
                      borderBottom: "1px solid var(--border-primary)",
                      background: isTop3 ? "rgba(212,160,23,0.03)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2.5" style={{
                      fontFamily: "var(--font-display)",
                      color: isTop3 ? "var(--dirt)" : "var(--text-muted)",
                    }}>
                      {getRankDisplay(idx)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {entry.userName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{
                      fontFamily: "var(--font-display)",
                      color: entry.rankingScore > 0 ? "var(--field)" : entry.rankingScore < 0 ? "var(--stitch)" : "var(--text-muted)",
                    }}>
                      {fmtScore(entry.rankingScore)}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{
                      fontFamily: "var(--font-display)",
                      color: entry.titleScore > 0 ? "var(--field)" : "var(--text-muted)",
                    }}>
                      {fmtScore(entry.titleScore)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className="inline-block rounded-sm px-2 py-0.5"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          background: isTop3 ? "rgba(212,160,23,0.08)" : "var(--bg-elevated)",
                          color: entry.totalScore > 0 ? "var(--dirt)" : "var(--stitch)",
                          border: `1px solid ${isTop3 ? "rgba(212,160,23,0.2)" : "var(--border-primary)"}`,
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
      )}
    </div>
  );
}
