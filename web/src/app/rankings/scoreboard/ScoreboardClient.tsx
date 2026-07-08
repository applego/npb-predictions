"use client";

import { useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { formatPredictionOwnerSubline } from "@/lib/prediction-owner-display";

// ── Types ──

interface ScoreEntry {
  userId: number;
  userName: string;
  slug?: string;
  userRole?: string;
  source?: string | null;
  sourceUrl?: string | null;
  variant?: string | null;
  rankingScore: number;
  titleScore: number;
  totalScore: number;
}

interface RankDetail {
  rank: number;
  predictedTeam: string;
  actualTeam: string;
  actualRank: number | null;
  score: number;
}

interface ExpandData {
  centralDetails: RankDetail[];
  pacificDetails: RankDetail[];
  rankingScore: number;
  titleScore: number;
  totalScore: number;
}

const SHORT_NAMES: Record<string, string> = {
  "読売ジャイアンツ": "巨人",
  "阪神タイガース": "阪神",
  "横浜DeNAベイスターズ": "DeNA",
  "広島東洋カープ": "広島",
  "中日ドラゴンズ": "中日",
  "東京ヤクルトスワローズ": "ヤクルト",
  "オリックス・バファローズ": "オリックス",
  "福岡ソフトバンクホークス": "ソフトバンク",
  "千葉ロッテマリーンズ": "ロッテ",
  "東北楽天ゴールデンイーグルス": "楽天",
  "埼玉西武ライオンズ": "西武",
  "北海道日本ハムファイターズ": "日本ハム",
};

function fmtScore(score: number) {
  return score > 0 ? `+${score}` : String(score);
}

function getRankDisplay(index: number) {
  if (index === 0) return "\u{1F947}";
  if (index === 1) return "\u{1F948}";
  if (index === 2) return "\u{1F949}";
  return `${index + 1}`;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score > 0 ? "var(--field)" : score < 0 ? "var(--stitch)" : "var(--text-muted)";
  return (
    <span
      className="inline-block rounded-sm px-1.5 py-0.5 text-xs font-bold tabular-nums"
      style={{
        fontFamily: "var(--font-display)",
        color,
        background: score > 0 ? "rgba(46,125,50,0.08)" : score < 0 ? "rgba(229,57,53,0.08)" : "var(--bg-elevated)",
        border: `1px solid ${score > 0 ? "rgba(46,125,50,0.2)" : score < 0 ? "rgba(229,57,53,0.2)" : "var(--border-primary)"}`,
      }}
    >
      {fmtScore(score)}
    </span>
  );
}

function MiniLeagueTable({ label, badgeColor, details }: { label: string; badgeColor: string; details: RankDetail[] }) {
  if (details.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="rounded px-1 py-0.5 text-[9px] font-black" style={{ background: badgeColor, color: "#fff" }}>
          {label}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
            {["#", "予想", "実際", "結果"].map((c, i) => (
              <th
                key={c}
                className={`px-2 py-1 font-medium ${i === 3 ? "text-right" : "text-left"}`}
                style={{ color: "var(--text-muted)", fontSize: "10px" }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {details.map((d) => (
            <tr key={d.rank} style={{ borderBottom: "1px solid var(--border-primary)" }}>
              <td className="px-2 py-1" style={{ color: "var(--text-muted)" }}>{d.rank}位</td>
              <td className="px-2 py-1 font-medium" style={{ color: "var(--text-primary)" }}>
                {SHORT_NAMES[d.predictedTeam] ?? d.predictedTeam}
              </td>
              <td className="px-2 py-1" style={{ color: "var(--text-secondary)" }}>
                {d.actualTeam ? (SHORT_NAMES[d.actualTeam] ?? d.actualTeam) : "\u2014"}
              </td>
              <td className="px-2 py-1 text-right">
                <ScoreBadge score={d.score} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sparkline (client-side) ──

function Sparkline({
  scores,
  width = 60,
  height = 16,
}: {
  scores: number[];
  width?: number;
  height?: number;
}) {
  if (scores.length < 2) return <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>—</span>;
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;
  const pad = 2;
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * width;
    const y = height - pad - ((s - minS) / range) * (height - pad * 2);
    return [x, y] as [number, number];
  });
  const delta = scores[scores.length - 1] - scores[scores.length - 2];
  const color = delta >= 0 ? "#4ade80" : "#f87171";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" fill={color} opacity="0.9" />)}
    </svg>
  );
}

// ── Main Component ──

const API_BASE =
  typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev");

export function ScoreboardTable({
  scores,
  year,
  sparklineData,
}: {
  scores: ScoreEntry[];
  year: number;
  sparklineData: Record<number, number[]>; // userId -> scores by year
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandCache, setExpandCache] = useState<Record<number, ExpandData>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const nameCounts = scores.reduce((counts, entry) => {
    counts.set(entry.userName, (counts.get(entry.userName) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  const toggleExpand = useCallback(async (userId: number, slug?: string, userRole?: string) => {
    if (userRole !== "commentator") return;
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(userId);

    if (expandCache[userId]) return;
    if (!slug) return;

    setLoadingId(userId);
    try {
      const res = await fetch(`/api/commentators/${slug}?year=${year}`);
      if (res.ok) {
        const data = (await res.json()) as { seasons?: ExpandData[] };
        const seasonData = data.seasons?.[0];
        if (seasonData) {
          setExpandCache((prev) => ({
            ...prev,
            [userId]: {
              centralDetails: seasonData.centralDetails,
              pacificDetails: seasonData.pacificDetails,
              rankingScore: seasonData.rankingScore,
              titleScore: seasonData.titleScore,
              totalScore: seasonData.totalScore,
            },
          }));
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingId(null);
    }
  }, [expandedId, expandCache, year]);

  return (
    <div
      className="max-w-full overflow-x-auto rounded-xl"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <table className="w-full min-w-[26rem] text-sm">
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-primary)" }}>
            {["#", "予想者", "順位点", "タイトル点", "合計", "趨勢"].map((col, i) => (
              <th
                key={col}
                className={`px-3 py-2.5 text-xs font-medium ${i >= 2 && col !== "趨勢" ? "text-right" : "text-left"}`}
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
          {scores.map((entry, idx) => {
            const isTop3 = idx < 3;
            const canExpand = entry.userRole === "commentator" && Boolean(entry.slug);
            const isExpanded = expandedId === entry.userId;
            const cached = expandCache[entry.userId];
            const isLoading = loadingId === entry.userId;
            const sparkScores = sparklineData[entry.userId];
            const metaLine = formatPredictionOwnerSubline({
              source: entry.source,
              variant: entry.variant,
              slug: entry.slug,
              activeYears: [year],
              includeSlugFallback: (nameCounts.get(entry.userName) ?? 0) > 1,
            });

            return (
              <Fragment key={entry.userId}>
                <tr
                  onClick={() => toggleExpand(entry.userId, entry.slug, entry.userRole)}
                  style={{
                    borderBottom: isExpanded ? "none" : "1px solid var(--border-primary)",
                    background: isTop3 ? "rgba(212,160,23,0.03)" : "transparent",
                    cursor: canExpand ? "pointer" : "default",
                  }}
                >
                  <td
                    className="px-3 py-2.5"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: isTop3 ? "var(--dirt)" : "var(--text-muted)",
                    }}
                  >
                    {getRankDisplay(idx)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {entry.userName}
                      </span>
                      <span
                        className="rounded-sm px-1 py-0.5 text-[10px]"
                        style={{
                          color: entry.userRole === "commentator" ? "var(--stitch)" : "var(--text-muted)",
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-primary)",
                        }}
                      >
                        {entry.userRole === "commentator" ? "解説者" : "参加者"}
                      </span>
                      {canExpand && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {isExpanded ? "\u25B2" : "\u25BC"}
                        </span>
                      )}
                    </div>
                    {metaLine && (
                      <div
                        className="mt-1 text-[10px] leading-snug"
                        style={{
                          color: "var(--text-muted)",
                          maxWidth: "12rem",
                          whiteSpace: "normal",
                        }}
                      >
                        {metaLine}
                      </div>
                    )}
                  </td>
                  <td
                    className="px-3 py-2.5 text-right"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: entry.rankingScore > 0 ? "var(--field)" : entry.rankingScore < 0 ? "var(--stitch)" : "var(--text-muted)",
                    }}
                  >
                    {fmtScore(entry.rankingScore)}
                  </td>
                  <td
                    className="px-3 py-2.5 text-right"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: entry.titleScore > 0 ? "var(--field)" : "var(--text-muted)",
                    }}
                  >
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
                  <td className="px-3 py-2.5">
                    {sparkScores && <Sparkline scores={sparkScores} />}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${entry.userId}-expand`}>
                    <td
                      colSpan={6}
                      style={{
                        background: "var(--bg-inset)",
                        borderBottom: "1px solid color-mix(in srgb, var(--stitch) 10%, transparent)",
                      }}
                    >
                      {isLoading ? (
                        <div className="px-4 py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                          読み込み中...
                        </div>
                      ) : cached ? (
                        <div className="space-y-3 px-4 py-4 sm:px-6">
                          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <span>順位予想: <span style={{ color: "var(--stitch)" }}>{fmtScore(cached.rankingScore)}pt</span></span>
                            <span>タイトル予想: <span style={{ color: "var(--stitch)" }}>{fmtScore(cached.titleScore)}pt</span></span>
                            <span>合計: <span style={{ color: "var(--stitch)", fontWeight: 600 }}>{fmtScore(cached.totalScore)}pt</span></span>
                            {canExpand && entry.slug && (
                              <Link
                                href={`/commentators/${entry.slug}?year=${year}`}
                                className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                                style={{
                                  background: "var(--bg-elevated)",
                                  border: "1px solid var(--border-primary)",
                                  color: "var(--stitch)",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                詳細ページ →
                              </Link>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <MiniLeagueTable label="セ" badgeColor="var(--central, #1E40AF)" details={cached.centralDetails} />
                            <MiniLeagueTable label="パ" badgeColor="var(--pacific, #B91C1C)" details={cached.pacificDetails} />
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                          予想データがありません
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
