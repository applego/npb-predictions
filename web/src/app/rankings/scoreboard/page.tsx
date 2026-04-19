export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import { getSeasons, getScoreboardData } from "@/lib/scoreboard";
import { ScoreboardTable } from "./ScoreboardClient";
import {
  canonicalAlternates,
  clampDescription,
  ogImageUrl,
  socialPreview,
  SEO_TERMS,
} from "@/lib/seo-meta";

const CURRENT_YEAR = new Date().getFullYear();

export const revalidate = 600;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; view?: string }>;
}): Promise<Metadata> {
  const { year: yearParam, view } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : CURRENT_YEAR;
  const isCurrent = year >= CURRENT_YEAR;
  const isTrend = view === "trend";
  const suffix = isTrend ? " 時系列推移" : isCurrent ? "" : " 最終結果";
  const title = `${year}年 スコアボード${suffix}`;
  const description = clampDescription(
    isTrend
      ? `${year}年${SEO_TERMS.site}スコアボードの時系列推移。${SEO_TERMS.bothLeagues}順位予想の的中点を年度別に比較し、各予想家の成績を可視化します。`
      : isCurrent
        ? `${year}年${SEO_TERMS.npbFull}シーズンのスコアボード。${SEO_TERMS.bothLeagues}順位予想の的中点をリアルタイム集計して順位付けします。`
        : `${year}年${SEO_TERMS.npbFull}シーズンの最終スコアボード。${SEO_TERMS.bothLeagues}順位予想の確定的中点とランキングを一覧で確認できます。`,
  );
  const pathname = `/rankings/scoreboard?year=${year}${isTrend ? "&view=trend" : ""}`;
  const og = ogImageUrl("season", { year });

  return {
    title,
    description,
    keywords: [
      SEO_TERMS.site,
      `${year}年 スコアボード`,
      `${SEO_TERMS.npbShort} 順位予想 スコア`,
      "的中点 ランキング",
    ],
    alternates: canonicalAlternates(pathname),
    ...socialPreview({ title, description, pathname, ogImage: og }),
  };
}

// ── Types ──

type UserYearStat = { score: number; rank: number };
type UserHistory = {
  userId: number;
  name: string;
  byYear: Map<number, UserYearStat>;
};

// ── Helpers ──

function fmtScore(score: number) {
  return score > 0 ? `+${score}` : String(score);
}

function getRankDisplay(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

function getScoreColor(score: number): string {
  if (score >= 20) return "#4ade80";
  if (score >= 8) return "#86efac";
  if (score > 0) return "rgba(255,255,255,0.5)";
  if (score >= -8) return "#fb923c";
  return "#f87171";
}

function getRankCellStyle(
  rank: number,
  total: number,
): { color: string; bg: string } {
  if (rank === 1) return { color: "#d4a017", bg: "rgba(212,160,23,0.10)" };
  if (rank === 2) return { color: "#94a3b8", bg: "rgba(148,163,184,0.08)" };
  if (rank === 3) return { color: "#b45309", bg: "rgba(180,83,9,0.08)" };
  const pct = rank / total;
  if (pct <= 0.2) return { color: "#4ade80", bg: "rgba(74,222,128,0.06)" };
  if (pct <= 0.5) return { color: "rgba(255,255,255,0.55)", bg: "transparent" };
  return { color: "rgba(255,255,255,0.22)", bg: "transparent" };
}

function buildUserHistory(
  allResults: Array<{
    year: number;
    data: Awaited<ReturnType<typeof getScoreboardData>>;
  }>,
): UserHistory[] {
  const map = new Map<
    number,
    { name: string; byYear: Map<number, UserYearStat> }
  >();
  for (const { year, data } of allResults) {
    if (!data || data.scores.length === 0) continue;
    data.scores.forEach((entry, idx) => {
      if (!map.has(entry.userId)) {
        map.set(entry.userId, { name: entry.userName, byYear: new Map() });
      }
      map.get(entry.userId)!.byYear.set(year, {
        score: entry.totalScore,
        rank: idx + 1,
      });
    });
  }
  return Array.from(map.entries()).map(([userId, info]) => ({
    userId,
    name: info.name,
    byYear: info.byYear,
  }));
}

// ── Sparkline ──

function Sparkline({
  byYear,
  years,
  width = 60,
  height = 16,
}: {
  byYear: Map<number, UserYearStat>;
  years: number[];
  width?: number;
  height?: number;
}) {
  const valid = years.filter((y) => byYear.has(y));
  if (valid.length < 2)
    return (
      <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "9px" }}>
        —
      </span>
    );

  const scores = valid.map((y) => byYear.get(y)!.score);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;
  const pad = 2;

  const pts = valid.map((y, i) => {
    const x = ((i / (valid.length - 1)) * width * 10) / 10;
    const yv =
      height -
      pad -
      ((byYear.get(y)!.score - minS) / range) * (height - pad * 2);
    return [x, yv] as [number, number];
  });

  const last = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  const delta = byYear.get(last)!.score - byYear.get(prev)!.score;
  const lineColor = delta >= 0 ? "#4ade80" : "#f87171";

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <polyline
        points={polyline}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill={lineColor} opacity="0.9" />
      ))}
    </svg>
  );
}

// ── Main Page ──

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; view?: string }>;
}) {
  const { year: yearParam, view } = await searchParams;
  const selectedYear = yearParam ? parseInt(yearParam, 10) : CURRENT_YEAR;
  const isTrend = view === "trend";
  const isCurrent = selectedYear >= CURRENT_YEAR;

  const allSeasons = await getSeasons();
  const sortedSeasons = [...allSeasons].sort((a, b) => a.year - b.year);

  // Fetch all years in parallel for cross-year trend data
  const allResults = await Promise.all(
    sortedSeasons.map((s) =>
      getScoreboardData(s.year).then((data) => ({ year: s.year, data })),
    ),
  );

  const activeYears = allResults
    .filter((r) => r.data && r.data.scores.length > 0)
    .map((r) => r.year)
    .sort((a, b) => a - b);

  const userHistory = buildUserHistory(allResults);
  const currentData =
    allResults.find((r) => r.year === selectedYear)?.data ?? null;

  // Trend view: users with 2+ years, sorted by avg score
  const trendUsers = userHistory
    .filter((u) => u.byYear.size >= 2)
    .sort((a, b) => {
      const avgA =
        [...a.byYear.values()].reduce((s, v) => s + v.score, 0) /
        a.byYear.size;
      const avgB =
        [...b.byYear.values()].reduce((s, v) => s + v.score, 0) /
        b.byYear.size;
      return avgB - avgA;
    });

  const reversedActiveYears = [...activeYears].reverse();

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
            <span style={{ color: "var(--stitch)" }}>
              {isTrend ? "ALL" : selectedYear}
            </span>{" "}
            {isTrend
              ? "TIME TREND"
              : isCurrent
                ? "STANDINGS"
                : "FINAL STANDINGS"}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {isTrend
              ? `${trendUsers.length}人 / ${activeYears.length}シーズンの時系列推移`
              : `${isCurrent ? "シーズン進行中" : `${selectedYear}年シーズン確定結果`}${currentData ? ` — ${currentData.scores.length}人` : ""}`}
          </p>
        </div>
        <ShareButton type="scoreboard" year={selectedYear} />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View toggle */}
        <div
          className="flex overflow-hidden rounded-md"
          style={{ border: "1px solid var(--border-primary)" }}
        >
          <Link
            href={`/rankings/scoreboard?year=${selectedYear}&view=year`}
            className="px-3 py-1.5 text-xs font-bold tracking-wider transition-all"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.1em",
              background: !isTrend ? "var(--stitch)" : "transparent",
              color: !isTrend ? "#fff" : "var(--text-muted)",
            }}
          >
            年別
          </Link>
          <Link
            href={`/rankings/scoreboard?year=${selectedYear}&view=trend`}
            className="px-3 py-1.5 text-xs font-bold tracking-wider transition-all"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.1em",
              background: isTrend ? "var(--stitch)" : "transparent",
              color: isTrend ? "#fff" : "var(--text-muted)",
              borderLeft: "1px solid var(--border-primary)",
            }}
          >
            時系列
          </Link>
        </div>

        {/* Year selector — only in year view */}
        {!isTrend && sortedSeasons.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {sortedSeasons
              .slice()
              .reverse()
              .map((s) => (
                <Link
                  key={s.year}
                  href={`/rankings/scoreboard?year=${s.year}&view=year`}
                  className="rounded-sm px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.06em",
                    background:
                      s.year === selectedYear ? "var(--stitch)" : "var(--bg-surface)",
                    color:
                      s.year === selectedYear ? "#fff" : "var(--text-muted)",
                    border: `1px solid ${s.year === selectedYear ? "var(--stitch)" : "var(--border-primary)"}`,
                  }}
                >
                  {s.year}
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* ── Trend View ── */}
      {isTrend ? (
        trendUsers.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <p style={{ color: "var(--text-muted)" }}>
              複数年のデータがある予想者がいません
            </p>
          </div>
        ) : (
          <div
            className="overflow-x-auto rounded-xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <table
              style={{ fontSize: "12px", borderCollapse: "collapse", width: "100%" }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-primary)" }}>
                  <th
                    className="sticky left-0 px-3 py-2.5 text-left"
                    style={{
                      background: "var(--bg-inset)",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.1em",
                      zIndex: 2,
                      minWidth: "130px",
                    }}
                  >
                    予想者
                  </th>
                  {reversedActiveYears.map((y) => (
                    <th
                      key={y}
                      className="px-2 py-2.5 text-center"
                      style={{
                        background: "var(--bg-inset)",
                        color:
                          y === selectedYear
                            ? "var(--stitch)"
                            : "var(--text-muted)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.06em",
                        minWidth: "60px",
                        borderLeft: "1px solid var(--border-primary)",
                      }}
                    >
                      {y}
                      {y === selectedYear && (
                        <span
                          style={{
                            display: "block",
                            fontSize: "8px",
                            color: "var(--stitch)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          ◀ NOW
                        </span>
                      )}
                    </th>
                  ))}
                  <th
                    className="px-3 py-2.5 text-right"
                    style={{
                      background: "var(--bg-inset)",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.06em",
                      minWidth: "52px",
                      borderLeft: "1px solid var(--border-primary)",
                    }}
                  >
                    平均
                  </th>
                  <th
                    className="px-3 py-2.5"
                    style={{
                      background: "var(--bg-inset)",
                      color: "var(--text-muted)",
                      minWidth: "72px",
                      borderLeft: "1px solid var(--border-primary)",
                    }}
                  >
                    趨勢
                  </th>
                </tr>
              </thead>
              <tbody>
                {trendUsers.map((user, idx) => {
                  const scores = [...user.byYear.values()];
                  const avg =
                    scores.reduce((s, v) => s + v.score, 0) / scores.length;
                  const rowBg =
                    idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)";
                  return (
                    <tr
                      key={user.userId}
                      style={{
                        borderBottom: "1px solid var(--border-primary)",
                        background: rowBg,
                      }}
                    >
                      <td
                        className="sticky left-0 px-3 py-2"
                        style={{
                          background:
                            idx % 2 === 0
                              ? "var(--bg-surface)"
                              : "color-mix(in srgb, var(--bg-surface) 98%, white)",
                          zIndex: 1,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontWeight: 500,
                          }}
                        >
                          {user.name}
                        </span>
                        <span
                          className="ml-1.5"
                          style={{ color: "var(--text-muted)", fontSize: "10px" }}
                        >
                          {user.byYear.size}年
                        </span>
                      </td>
                      {reversedActiveYears.map((y) => {
                        const stat = user.byYear.get(y);
                        const totalUsers =
                          allResults.find((r) => r.year === y)?.data?.scores
                            .length ?? 1;
                        if (!stat) {
                          return (
                            <td
                              key={y}
                              className="px-2 py-2 text-center"
                              style={{
                                color: "rgba(255,255,255,0.07)",
                                borderLeft: "1px solid var(--border-primary)",
                              }}
                            >
                              —
                            </td>
                          );
                        }
                        const { color, bg } = getRankCellStyle(
                          stat.rank,
                          totalUsers,
                        );
                        return (
                          <td
                            key={y}
                            className="px-1.5 py-1.5 text-center"
                            style={{
                              borderLeft: "1px solid var(--border-primary)",
                              background:
                                y === selectedYear
                                  ? "rgba(229,57,53,0.03)"
                                  : "transparent",
                            }}
                          >
                            <div
                              style={{
                                background: bg,
                                borderRadius: "4px",
                                padding: "2px 4px",
                              }}
                            >
                              <div
                                style={{
                                  color,
                                  fontFamily: "var(--font-display)",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {stat.rank}位
                              </div>
                              <div
                                style={{
                                  color: getScoreColor(stat.score),
                                  fontSize: "10px",
                                  marginTop: "1px",
                                }}
                              >
                                {fmtScore(stat.score)}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td
                        className="px-2 py-2 text-right"
                        style={{
                          color: getScoreColor(avg),
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          fontSize: "11px",
                          borderLeft: "1px solid var(--border-primary)",
                        }}
                      >
                        {fmtScore(Math.round(avg * 10) / 10)}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ borderLeft: "1px solid var(--border-primary)" }}
                      >
                        <Sparkline
                          byYear={user.byYear}
                          years={activeYears}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ── Year View ── */
        !currentData || currentData.scores.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <p style={{ color: "var(--text-muted)" }}>
              {isCurrent
                ? `${selectedYear}シーズンはまだ結果が確定していません`
                : `${selectedYear}年のスコアデータがありません`}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href={`/rankings/predictions?year=${selectedYear}`}
                className="rounded-sm px-4 py-2 text-sm"
                style={{
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-secondary)",
                }}
              >
                {selectedYear}年の予想を見る
              </Link>
              <Link
                href="/rankings/commentators"
                className="rounded-sm px-4 py-2 text-sm"
                style={{
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-secondary)",
                }}
              >
                解説者ランキング
              </Link>
            </div>
          </div>
        ) : (
          <ScoreboardTable
            scores={currentData.scores}
            year={selectedYear}
            sparklineData={Object.fromEntries(
              userHistory
                .filter((u) => u.byYear.size >= 2)
                .map((u) => [
                  u.userId,
                  activeYears.filter((y) => u.byYear.has(y)).map((y) => u.byYear.get(y)!.score),
                ]),
            )}
          />
        )
      )}
    </div>
  );
}
