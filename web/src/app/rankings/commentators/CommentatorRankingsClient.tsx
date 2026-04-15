"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  type LeagueFilter,
  type SortKey,
  type CommentatorData,
  type CommentatorRankingsResponse,
  type RankingDetail,
  getSourceBadgeColors,
  getDiffLabel,
} from "@/lib/commentator-types";

// ── Constants ──

const AVAILABLE_YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

type YearOption = (typeof AVAILABLE_YEARS)[number] | "all";

const YEAR_TABS: { value: YearOption; label: string }[] = [
  ...AVAILABLE_YEARS.map((y) => ({ value: y as YearOption, label: String(y) })),
  { value: "all" as const, label: "ALL" },
];

const LEAGUE_TABS: { value: LeagueFilter; label: string }[] = [
  { value: "all", label: "セ+パ合算" },
  { value: "central", label: "セのみ" },
  { value: "pacific", label: "パのみ" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "スコア順" },
  { value: "name", label: "名前順" },
];

// ── Team colors ──

const TEAM_COLOR_MAP: Record<string, string> = {
  "読売": "#F97316", "巨人": "#F97316",
  "DeNA": "#3B82F6", "横浜": "#3B82F6",
  "阪神": "#EAB308",
  "広島": "#EF4444",
  "ヤクルト": "#22C55E", "スワローズ": "#22C55E",
  "中日": "#6366F1", "ドラゴンズ": "#6366F1",
  "ソフトバンク": "#F59E0B", "ホークス": "#F59E0B",
  "オリックス": "#0EA5E9", "バファローズ": "#0EA5E9",
  "ロッテ": "#94A3B8", "マリーンズ": "#94A3B8",
  "楽天": "#DC2626", "イーグルス": "#DC2626",
  "日本ハム": "#2563EB", "日ハム": "#2563EB", "ファイターズ": "#2563EB",
  "西武": "#7C3AED", "ライオンズ": "#7C3AED",
};

function getTeamColor(name: string): string {
  for (const [key, color] of Object.entries(TEAM_COLOR_MAP)) {
    if (name.includes(key)) return color;
  }
  return "#6B7280";
}

// ── Helpers ──

function getRankDisplay(index: number): string {
  if (index === 0) return "\u{1F947}"; // gold
  if (index === 1) return "\u{1F948}"; // silver
  if (index === 2) return "\u{1F949}"; // bronze
  return String(index + 1);
}

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function getOrCreateFingerprint(): string {
  try {
    const stored = localStorage.getItem("npb_fp");
    if (stored) return stored;
    const fp = crypto.randomUUID();
    localStorage.setItem("npb_fp", fp);
    return fp;
  } catch {
    return "anon";
  }
}

function storePrevRanks(key: string, ranks: Map<number, number>) {
  try {
    const obj: Record<string, number> = {};
    ranks.forEach((rank, uid) => { obj[uid] = rank; });
    localStorage.setItem(key, JSON.stringify(obj));
  } catch { /* ignore */ }
}

function loadPrevRanks(key: string): Map<number, number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, number>;
    return new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));
  } catch {
    return new Map();
  }
}

// ── Sub-components ──

function SourceBadgeChip({ source, sourceUrl }: { source: string | null; sourceUrl?: string | null }) {
  const colors = getSourceBadgeColors(source);
  const chipStyle = {
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    color: colors.text,
  };
  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={chipStyle}
        onClick={(e) => e.stopPropagation()}
        title={`${source ?? "その他"} — 別タブで開く`}
      >
        {source ?? "その他"} ↗
      </a>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
      style={chipStyle}
    >
      {source ?? "その他"}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
  accentColor = "var(--stitch)",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded px-3 py-2.5 text-xs font-medium tracking-wider transition-all"
      style={{
        fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
        letterSpacing: "0.12em",
        background: active ? `${accentColor}12` : "var(--bg-elevated)",
        border: active
          ? `1px solid ${accentColor}40`
          : "1px solid var(--border-primary)",
        color: active ? accentColor : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

// ── Rank Change Badge ──

function RankChangeBadge({ delta }: { delta: number | null | undefined }) {
  if (delta === undefined || delta === null) {
    return (
      <span
        className="rounded px-1 py-0.5 text-[10px] font-bold"
        style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", letterSpacing: "0.05em" }}
      >
        NEW
      </span>
    );
  }
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className="text-xs font-bold"
      style={{ color: up ? "#4ade80" : "#f87171" }}
    >
      {up ? "↑" : "↓"}{Math.abs(delta)}
    </span>
  );
}

// ── Like Button ──

function LikeButton({
  count,
  liked,
  onLike,
}: {
  count: number;
  liked: boolean;
  onLike: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onLike(); }}
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition-all"
      style={{
        color: liked ? "var(--stitch)" : "var(--text-muted)",
        border: `1px solid ${liked ? "rgba(229,57,53,0.3)" : "var(--border-primary)"}`,
        background: liked ? "rgba(229,57,53,0.06)" : "transparent",
        cursor: "pointer",
        minWidth: "2.5rem",
      }}
      title={liked ? "いいね取り消し" : "いいね"}
    >
      <span style={{ fontSize: "12px" }}>{liked ? "❤️" : "🤍"}</span>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

// ── Prediction vs Actual Table ──

function PredictionVsActualTable({
  league,
  details,
}: {
  league: "セ・リーグ" | "パ・リーグ";
  details: RankingDetail[];
}) {
  if (details.length === 0) return null;

  return (
    <div className="space-y-2">
      <div
        className="text-xs font-medium tracking-wide"
        style={{
          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
          color: "rgba(229,57,53,0.7)",
          letterSpacing: "0.15em",
        }}
      >
        {league}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <th className="px-2 py-1.5 text-left" style={{ color: "var(--text-muted)", width: "3rem" }}>順位</th>
            <th className="px-2 py-1.5 text-left" style={{ color: "var(--text-muted)" }}>予想</th>
            <th className="px-2 py-1.5 text-left" style={{ color: "var(--text-muted)" }}>実際</th>
            <th className="px-2 py-1.5 text-right" style={{ color: "var(--text-muted)", width: "5.5rem" }}>結果</th>
          </tr>
        </thead>
        <tbody>
          {details.map((detail) => {
            const diffInfo = getDiffLabel(detail.diff, detail.score);
            const isCorrect = detail.diff === 0;
            return (
              <tr
                key={detail.rank}
                style={{
                  borderBottom: "1px solid var(--border-primary)",
                  background: isCorrect ? "rgba(74,222,128,0.04)" : "transparent",
                }}
              >
                <td className="px-2 py-1.5" style={{ color: "var(--text-secondary)" }}>{detail.rank}位</td>
                <td className="px-2 py-1.5" style={{ color: "var(--text-primary)" }}>{detail.predictedTeam}</td>
                <td className="px-2 py-1.5" style={{ color: "var(--text-primary)" }}>{detail.actualTeam || "---"}</td>
                <td className="px-2 py-1.5 text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: diffInfo.color }}>
                    {isCorrect ? (
                      <><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />{diffInfo.text}</>
                    ) : (
                      diffInfo.text
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Expanded Detail Panel ──

function ExpandedDetail({ entry }: { entry: CommentatorData }) {
  return (
    <tr>
      <td
        colSpan={6}
        style={{
          background: "var(--bg-inset)",
          borderBottom: "1px solid color-mix(in srgb, var(--stitch) 10%, transparent)",
        }}
      >
        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span>順位予想: <span style={{ color: "var(--stitch)" }}>{fmtScore(entry.rankingScore)}pt</span></span>
            <span>タイトル予想: <span style={{ color: "var(--stitch)" }}>{fmtScore(entry.titleScore)}pt</span></span>
            <span>合計: <span style={{ color: "var(--stitch)", fontWeight: 600 }}>{fmtScore(entry.totalScore)}pt</span></span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PredictionVsActualTable league="セ・リーグ" details={entry.centralDetails} />
            <PredictionVsActualTable league="パ・リーグ" details={entry.pacificDetails} />
          </div>
          {entry.variant && (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              予想バリアント: {entry.variant}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Leaderboard Row ──

function LeaderboardRow({
  entry,
  rank,
  league,
  isExpanded,
  onToggle,
  rankChange,
  likeCount,
  liked,
  onLike,
}: {
  entry: CommentatorData;
  rank: number;
  league: LeagueFilter;
  isExpanded: boolean;
  onToggle: () => void;
  rankChange?: number | null;
  likeCount: number;
  liked: boolean;
  onLike: () => void;
}) {
  const isTop3 = rank < 3;
  const isFirst = rank === 0;
  const rankLabel = getRankDisplay(rank);

  const displayScore =
    league === "central"
      ? entry.centralScore
      : league === "pacific"
        ? entry.pacificScore
        : entry.totalScore;

  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        onClick={onToggle}
        style={{
          borderBottom: isExpanded ? "none" : "1px solid var(--border-primary)",
          background: isFirst
            ? "rgba(229,57,53,0.04)"
            : isExpanded
              ? "rgba(229,57,53,0.02)"
              : "transparent",
        }}
      >
        {/* Rank + change */}
        <td className="px-3 py-3 text-center sm:px-4">
          <div className="inline-flex flex-col items-center gap-0.5">
            <span
              className="font-display text-base"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color: isTop3 ? "var(--stitch)" : "var(--text-secondary)",
                fontSize: isTop3 ? "1.25rem" : undefined,
              }}
            >
              {rankLabel}
            </span>
            <RankChangeBadge delta={rankChange} />
          </div>
        </td>

        {/* Name + Source + Like */}
        <td className="px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/rankings/commentators/${entry.slug}`}
              className="font-medium transition-colors hover:text-amber-400"
              style={{ color: "var(--text-primary)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {entry.name}
            </Link>
            <SourceBadgeChip source={entry.source} sourceUrl={entry.sourceUrl} />
            <LikeButton count={likeCount} liked={liked} onLike={onLike} />
          </div>
        </td>

        {/* Central score */}
        {league !== "pacific" && (
          <td className="hidden px-3 py-3 text-right sm:table-cell sm:px-4">
            <span
              className="font-display tabular-nums text-base"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color: entry.centralScore > 0 ? "var(--stitch)" : entry.centralScore < 0 ? "var(--stitch)" : "var(--text-muted)",
              }}
            >
              {fmtScore(entry.centralScore)}
            </span>
          </td>
        )}

        {/* Pacific score */}
        {league !== "central" && (
          <td className="hidden px-3 py-3 text-right sm:table-cell sm:px-4">
            <span
              className="font-display tabular-nums text-base"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color: entry.pacificScore > 0 ? "var(--stitch)" : entry.pacificScore < 0 ? "var(--stitch)" : "var(--text-muted)",
              }}
            >
              {fmtScore(entry.pacificScore)}
            </span>
          </td>
        )}

        {/* Total + Expand indicator */}
        <td className="px-3 py-3 text-right sm:px-4">
          <div className="flex items-center justify-end gap-2">
            <span
              className="inline-block rounded px-3 py-1 font-display tabular-nums text-base"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                background: isFirst ? "rgba(229,57,53,0.12)" : "var(--border-primary)",
                color: isFirst ? "var(--stitch)" : "var(--text-secondary)",
                border: isFirst ? "1px solid rgba(229,57,53,0.25)" : "1px solid var(--border-primary)",
              }}
            >
              {fmtScore(displayScore)}
            </span>
            <span
              className="text-xs transition-transform"
              style={{
                color: "var(--text-muted)",
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </div>
        </td>
      </tr>
      {isExpanded && <ExpandedDetail entry={entry} />}
    </>
  );
}

// ── First-Place Donut Chart ──

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(cx: number, cy: number, R: number, r: number, startDeg: number, endDeg: number) {
  const o1 = polarToXY(cx, cy, R, startDeg);
  const o2 = polarToXY(cx, cy, R, endDeg);
  const i1 = polarToXY(cx, cy, r, endDeg);
  const i2 = polarToXY(cx, cy, r, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${o1.x} ${o1.y} A ${R} ${R} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${r} ${r} 0 ${large} 0 ${i2.x} ${i2.y} Z`;
}

function FirstPlaceDonut({
  slices,
  title,
}: {
  slices: { team: string; count: number }[];
  title: string;
}) {
  const total = slices.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const cx = 80, cy = 80, R = 66, r = 42;
  let angle = -90; // start from top

  const segments = slices.map(({ team, count }) => {
    const sweep = (count / total) * 360;
    const start = angle;
    angle += sweep;
    return { team, count, path: sweep > 0.5 ? donutSegmentPath(cx, cy, R, r, start, angle) : null };
  });

  return (
    <div className="space-y-2">
      <div
        className="text-xs font-medium uppercase tracking-widest"
        style={{
          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
          color: "var(--text-muted)",
          letterSpacing: "0.18em",
        }}
      >
        {title}
      </div>
      <svg viewBox="0 0 160 160" style={{ width: "100%", maxWidth: "150px", height: "auto", display: "block" }}>
        {segments.map(({ team, path }) =>
          path ? (
            <path
              key={team}
              d={path}
              fill={getTeamColor(team)}
              stroke="var(--bg-surface)"
              strokeWidth="1.5"
            />
          ) : null,
        )}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="18"
          fontFamily="var(--font-display, 'Bebas Neue', Impact, sans-serif)"
          fill="rgba(255,255,255,0.75)"
        >
          {total}
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)">
          解説者
        </text>
      </svg>
      <div className="space-y-1">
        {slices.map(({ team, count }) => (
          <div key={team} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: getTeamColor(team) }}
            />
            <span style={{ color: "var(--text-secondary)" }}>{team}</span>
            <span
              className="ml-auto tabular-nums"
              style={{ color: "var(--text-primary)", fontWeight: 600 }}
            >
              {count}人 ({((count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Prediction Grid PNG Download ──

function downloadPredictionGrid(
  commentators: CommentatorData[],
  year: YearOption,
  actualCentral: Array<{ rank: number; teamName: string }>,
  actualPacific: Array<{ rank: number; teamName: string }>,
) {
  const CELL_W = 64;
  const CELL_H = 19;
  const NAME_W = 132;
  const HEADER_H = 52;
  const COL = 12;
  const W = NAME_W + COL * CELL_W;
  const H = HEADER_H + commentators.length * CELL_H + 1;
  const SCALE = 2;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = "#09090D";
  ctx.fillRect(0, 0, W, H);

  // Header band
  ctx.fillStyle = "rgba(229,57,53,0.1)";
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 13px Impact, 'Bebas Neue', sans-serif";
  ctx.fillText(
    `NPB ${year === "all" ? "ALL TIME" : year}シーズン 解説者順位予想グリッド`,
    10,
    20,
  );
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "9px sans-serif";
  ctx.fillText(`${commentators.length}名`, 10, 34);

  // Column headers
  const cols = ["セ1", "セ2", "セ3", "セ4", "セ5", "セ6", "パ1", "パ2", "パ3", "パ4", "パ5", "パ6"];
  cols.forEach((col, i) => {
    const x = NAME_W + i * CELL_W;
    ctx.fillStyle = i < 6 ? "rgba(229,57,53,0.18)" : "rgba(56,189,248,0.15)";
    ctx.fillRect(x, 0, CELL_W - 1, HEADER_H - 14);
    ctx.fillStyle = i < 6 ? "rgba(229,57,53,0.6)" : "rgba(56,189,248,0.6)";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText(col, x + CELL_W / 2 - 8, 16);

    // Actual result strip
    const actual =
      i < 6
        ? actualCentral.find((a) => a.rank === i + 1)?.teamName ?? ""
        : actualPacific.find((a) => a.rank === i - 5)?.teamName ?? "";
    ctx.fillStyle = actual ? getTeamColor(actual) : "rgba(255,255,255,0.05)";
    ctx.fillRect(x, HEADER_H - 14, CELL_W - 1, 14);
    if (actual) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px sans-serif";
      ctx.fillText(actual.slice(0, 4), x + 2, HEADER_H - 3);
    }
  });

  // Rows
  commentators.forEach((c, rowIdx) => {
    const y = HEADER_H + rowIdx * CELL_H;

    if (rowIdx % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(0, y, W, CELL_H);
    }

    // Rank
    ctx.fillStyle = "rgba(229,57,53,0.6)";
    ctx.font = "bold 8px sans-serif";
    ctx.fillText(String(rowIdx + 1), 4, y + CELL_H / 2 + 3);

    // Name
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "9px sans-serif";
    const name = c.name.length > 7 ? c.name.slice(0, 6) + "…" : c.name;
    ctx.fillText(name, 22, y + CELL_H / 2 + 3);

    // Score
    ctx.fillStyle = "rgba(229,57,53,0.5)";
    ctx.font = "bold 7px sans-serif";
    const scoreStr = c.totalScore > 0 ? `+${c.totalScore}` : String(c.totalScore);
    ctx.fillText(scoreStr, NAME_W - 26, y + CELL_H / 2 + 3);

    // Central picks
    for (let rank = 1; rank <= 6; rank++) {
      const pick = c.centralDetails.find((d) => d.rank === rank);
      if (!pick) continue;
      const x = NAME_W + (rank - 1) * CELL_W;
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = getTeamColor(pick.predictedTeam);
      ctx.fillRect(x, y + 1, CELL_W - 1, CELL_H - 2);
      ctx.globalAlpha = 1;
      if (pick.diff === 0) {
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, y + 1.75, CELL_W - 2.5, CELL_H - 3.5);
        ctx.lineWidth = 0.5;
      }
      ctx.fillStyle = "#fff";
      ctx.font = "7px sans-serif";
      ctx.fillText(pick.predictedTeam.slice(0, 4), x + 2, y + CELL_H / 2 + 3);
    }

    // Pacific picks
    for (let rank = 1; rank <= 6; rank++) {
      const pick = c.pacificDetails.find((d) => d.rank === rank);
      if (!pick) continue;
      const x = NAME_W + (rank - 1 + 6) * CELL_W;
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = getTeamColor(pick.predictedTeam);
      ctx.fillRect(x, y + 1, CELL_W - 1, CELL_H - 2);
      ctx.globalAlpha = 1;
      if (pick.diff === 0) {
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, y + 1.75, CELL_W - 2.5, CELL_H - 3.5);
        ctx.lineWidth = 0.5;
      }
      ctx.fillStyle = "#fff";
      ctx.font = "7px sans-serif";
      ctx.fillText(pick.predictedTeam.slice(0, 4), x + 2, y + CELL_H / 2 + 3);
    }

    // Row divider
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    ctx.moveTo(0, y + CELL_H);
    ctx.lineTo(W, y + CELL_H);
    ctx.stroke();
  });

  const link = document.createElement("a");
  link.download = `npb-predictions-${year}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ── Loading Skeleton ──

function LoadingSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl p-6"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-primary)",
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded"
          style={{ background: "var(--border-primary)", animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

// ── Main Client Component ──

export function CommentatorRankingsClient() {
  const [year, setYear] = useState<YearOption>(2025);
  const [league, setLeague] = useState<LeagueFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [data, setData] = useState<CommentatorRankingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Likes
  const [fingerprint, setFingerprint] = useState("");
  const [likeCounts, setLikeCounts] = useState<Map<number, number>>(new Map());
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  // Rank changes (delta vs previous session)
  const [rankChanges, setRankChanges] = useState<Map<number, number | null>>(new Map());

  // UI toggles
  const [showDistrib, setShowDistrib] = useState(false);

  // 1位予想分布 (memoized from data)
  const firstPlaceDistrib = useMemo(() => {
    if (!data) return { central: [], pacific: [] };
    const centralMap = new Map<string, number>();
    const pacificMap = new Map<string, number>();
    for (const c of data.commentators) {
      const cent = c.centralDetails.find((d) => d.rank === 1)?.predictedTeam;
      if (cent) centralMap.set(cent, (centralMap.get(cent) ?? 0) + 1);
      const pac = c.pacificDetails.find((d) => d.rank === 1)?.predictedTeam;
      if (pac) pacificMap.set(pac, (pacificMap.get(pac) ?? 0) + 1);
    }
    const toSorted = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).map(([team, count]) => ({ team, count }));
    return { central: toSorted(centralMap), pacific: toSorted(pacificMap) };
  }, [data]);

  // Init fingerprint
  useEffect(() => {
    setFingerprint(getOrCreateFingerprint());
  }, []);

  // Load liked IDs from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("npb_liked");
      if (raw) setLikedIds(new Set(JSON.parse(raw) as number[]));
    } catch { /* ignore */ }
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async (y: YearOption, l: LeagueFilter) => {
    if (y === "all") {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          AVAILABLE_YEARS.map(async (yr) => {
            const res = await fetch(`/api/rankings/commentators?year=${yr}&league=${l}`);
            if (!res.ok) return null;
            return (await res.json()) as CommentatorRankingsResponse;
          })
        );

        const aggregated = new Map<number, CommentatorData>();
        for (const result of results) {
          if (!result) continue;
          for (const c of result.commentators) {
            const existing = aggregated.get(c.userId);
            if (existing) {
              existing.centralScore += c.centralScore;
              existing.pacificScore += c.pacificScore;
              existing.rankingScore += c.rankingScore;
              existing.titleScore += c.titleScore;
              existing.totalScore += c.totalScore;
              existing.effectiveTotal += c.effectiveTotal;
              if (c.centralDetails.length > 0) existing.centralDetails = c.centralDetails;
              if (c.pacificDetails.length > 0) existing.pacificDetails = c.pacificDetails;
            } else {
              aggregated.set(c.userId, { ...c });
            }
          }
        }

        const sorted = Array.from(aggregated.values()).sort((a, b) => b.effectiveTotal - a.effectiveTotal);
        sorted.forEach((c, idx) => { c.rank = idx + 1; });

        setData({
          season: { id: 0, year: 0 },
          league: l,
          actualCentral: results.find((r) => r)?.actualCentral ?? [],
          actualPacific: results.find((r) => r)?.actualPacific ?? [],
          totalCommentators: sorted.length,
          commentators: sorted,
        });
      } catch {
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rankings/commentators?year=${y}&league=${l}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? `Error ${res.status}`);
        setData(null);
        return;
      }
      const json = (await res.json()) as CommentatorRankingsResponse;
      setData(json);
    } catch {
      setError("データの取得に失敗しました");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(year, league);
  }, [year, league, fetchData]);

  // Compute rank changes and fetch like counts when data changes
  useEffect(() => {
    if (!data) return;

    const storageKey = `npb_ranks_${year}_${league}`;
    const prevRanks = loadPrevRanks(storageKey);
    const currentRanks = new Map<number, number>();
    const changes = new Map<number, number | null>();

    data.commentators.forEach((c, idx) => {
      const currentRank = idx + 1;
      currentRanks.set(c.userId, currentRank);
      const prev = prevRanks.get(c.userId);
      if (prev === undefined) {
        changes.set(c.userId, null); // NEW
      } else {
        changes.set(c.userId, prev - currentRank); // positive = moved up
      }
    });

    setRankChanges(changes);
    storePrevRanks(storageKey, currentRanks);

    // Fetch like counts for top 50 (visible)
    const top50 = data.commentators.slice(0, 50).map((c) => c.userId);
    Promise.all(
      top50.map((uid) =>
        fetch(`/api/likes/${uid}`)
          .then((r) => r.json() as Promise<{ userId: number; count: number }>)
          .catch(() => ({ userId: uid, count: 0 }))
      )
    ).then((results) => {
      const map = new Map<number, number>();
      results.forEach((r) => map.set(r.userId, r.count));
      setLikeCounts(map);
    });
  }, [data, year, league]);

  // Toggle like
  const handleLike = useCallback(
    async (userId: number) => {
      if (!fingerprint) return;

      // Optimistic
      const wasLiked = likedIds.has(userId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        wasLiked ? next.delete(userId) : next.add(userId);
        try { localStorage.setItem("npb_liked", JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
      setLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(userId, (prev.get(userId) ?? 0) + (wasLiked ? -1 : 1));
        return next;
      });

      // API call
      try {
        const res = await fetch(`/api/likes/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint }),
        });
        const json = (await res.json()) as { count: number; liked: boolean };
        setLikeCounts((prev) => new Map(prev).set(userId, json.count));
        setLikedIds((prev) => {
          const next = new Set(prev);
          json.liked ? next.add(userId) : next.delete(userId);
          try { localStorage.setItem("npb_liked", JSON.stringify([...next])); } catch { /* ignore */ }
          return next;
        });
      } catch { /* keep optimistic state */ }
    },
    [fingerprint, likedIds]
  );

  // Client-side filtering
  const filtered = data
    ? (() => {
        let pool = [...data.commentators];
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          pool = pool.filter((c) => c.name.toLowerCase().includes(q));
        }
        if (sort === "name") pool.sort((a, b) => a.name.localeCompare(b.name, "ja"));
        return pool;
      })()
    : [];

  const headerCols: { label: string; align: string; hideMobile?: boolean }[] = [
    { label: "順位", align: "text-center" },
    { label: "解説者", align: "text-left" },
  ];
  if (league !== "pacific") headerCols.push({ label: "セ", align: "text-right", hideMobile: true });
  if (league !== "central") headerCols.push({ label: "パ", align: "text-right", hideMobile: true });
  headerCols.push({ label: "合計", align: "text-right" });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1
          className="leading-none"
          style={{
            fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            letterSpacing: "0.08em",
            color: "var(--text-primary)",
          }}
        >
          COMMENTATOR{" "}
          <span className="animate-amber-glow" style={{ color: "var(--stitch)" }}>
            RANKINGS
          </span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          プロ野球解説者 的中率ランキング
        </p>
      </div>

      {/* Controls */}
      <div
        className="space-y-4 rounded-xl p-4 sm:p-5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
      >
        <div>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)", letterSpacing: "0.18em" }}>YEAR</div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {YEAR_TABS.map((tab) => (
              <TabButton key={tab.value} active={year === tab.value} onClick={() => { setYear(tab.value); setExpandedId(null); }}>
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)", letterSpacing: "0.18em" }}>LEAGUE</div>
            <div className="flex flex-wrap gap-2">
              {LEAGUE_TABS.map((tab) => (
                <TabButton key={tab.value} active={league === tab.value} onClick={() => { setLeague(tab.value); setExpandedId(null); }} accentColor="#38bdf8">
                  {tab.label}
                </TabButton>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)", letterSpacing: "0.18em" }}>SORT</div>
            <div className="flex gap-2">
              {SORT_OPTIONS.map((opt) => (
                <TabButton key={opt.value} active={sort === opt.value} onClick={() => setSort(opt.value)} accentColor="#34d399">
                  {opt.label}
                </TabButton>
              ))}
            </div>
          </div>

          <div className="ml-auto w-full sm:w-auto">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)", letterSpacing: "0.18em" }}>SEARCH</div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="解説者名で検索..."
              className="w-full rounded px-3 py-1.5 text-sm outline-none transition-all sm:w-56"
              style={{ background: "var(--border-primary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {loading ? (
            "読み込み中..."
          ) : error ? (
            <span style={{ color: "var(--stitch)" }}>{error}</span>
          ) : filtered.length > 0 ? (
            <>
              {filtered.length}人表示 /{" "}
              <span style={{ color: "rgba(229,57,53,0.6)" }}>{data?.totalCommentators ?? 0}人</span>
              の解説者が参加
            </>
          ) : (
            "該当する解説者が見つかりません"
          )}
        </p>
        {data && !loading && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDistrib((v) => !v)}
              className="rounded px-2.5 py-2 text-xs font-medium tracking-wide transition-all"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                letterSpacing: "0.12em",
                background: showDistrib ? "rgba(56,189,248,0.12)" : "var(--bg-elevated)",
                border: showDistrib ? "1px solid rgba(56,189,248,0.35)" : "1px solid var(--border-primary)",
                color: showDistrib ? "#38bdf8" : "var(--text-secondary)",
              }}
            >
              {showDistrib ? "▲ 分布を閉じる" : "▼ 1位予想分布"}
            </button>
            <button
              type="button"
              onClick={() =>
                downloadPredictionGrid(
                  data.commentators,
                  year,
                  data.actualCentral.map((a) => ({ rank: a.rank, teamName: a.teamName })),
                  data.actualPacific.map((a) => ({ rank: a.rank, teamName: a.teamName })),
                )
              }
              className="rounded px-2.5 py-2 text-xs font-medium tracking-wide transition-all"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                letterSpacing: "0.12em",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              ↓ グリッド画像
            </button>
          </div>
        )}
        <span
          className="font-display text-xs tracking-widest"
          style={{
            fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            color: "var(--text-muted)",
            letterSpacing: "0.2em",
          }}
        >
          {year === "all" ? "ALL TIME" : year}
        </span>
      </div>

      {/* 1位予想分布 panel */}
      {showDistrib && data && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <div
            className="mb-4 text-xs font-medium uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color: "rgba(229,57,53,0.6)",
              letterSpacing: "0.2em",
            }}
          >
            1位予想分布 — 誰を優勝候補に選んだか
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {league !== "pacific" && (
              <FirstPlaceDonut
                slices={firstPlaceDistrib.central}
                title="セ・リーグ 1位予想"
              />
            )}
            {league !== "central" && (
              <FirstPlaceDonut
                slices={firstPlaceDistrib.pacific}
                title="パ・リーグ 1位予想"
              />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length > 0 ? (
        <div
          className="overflow-x-auto rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                {headerCols.map((col) => (
                  <th
                    key={col.label}
                    className={`px-3 py-3 text-xs font-medium uppercase tracking-widest sm:px-4 ${col.align} ${col.hideMobile ? "hidden sm:table-cell" : ""}`}
                    style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  rank={idx}
                  league={league}
                  isExpanded={expandedId === entry.userId}
                  onToggle={() => setExpandedId(expandedId === entry.userId ? null : entry.userId)}
                  rankChange={rankChanges.get(entry.userId)}
                  likeCount={likeCounts.get(entry.userId) ?? 0}
                  liked={likedIds.has(entry.userId)}
                  onLike={() => handleLike(entry.userId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : !error ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <p className="font-display mb-2 text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)", letterSpacing: "0.1em" }}>
            NO RESULTS
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>検索条件を変更してください</p>
        </div>
      ) : null}

      {/* Legend */}
      <section className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}>
        <div className="flex items-center gap-4">
          <div className="h-px flex-1" style={{ background: "var(--border-primary)" }} />
          <span className="font-display shrink-0 text-xs" style={{ fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)", color: "rgba(229,57,53,0.5)", letterSpacing: "0.25em" }}>
            ABOUT THIS RANKING
          </span>
          <div className="h-px flex-1" style={{ background: "var(--border-primary)" }} />
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <span><span style={{ color: "#4ade80" }}>的中 +5</span> = 完全一致</span>
            <span><span style={{ color: "#86efac" }}>1差 +3</span></span>
            <span><span style={{ color: "var(--stitch)" }}>2差 +1</span></span>
            <span><span style={{ color: "#fb923c" }}>3差 -1</span></span>
            <span><span style={{ color: "#f87171" }}>4差 -3</span></span>
            <span><span style={{ color: "#ef4444" }}>5差 -5</span></span>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span><span style={{ color: "#4ade80" }}>↑N</span> = 前回比N位アップ</span>
            <span><span style={{ color: "#f87171" }}>↓N</span> = 前回比N位ダウン</span>
            <span><span style={{ color: "#60a5fa" }}>NEW</span> = 新規ランクイン</span>
            <span>🤍 ❤️ = いいね（ブラウザごとに1票）</span>
          </div>
          <div className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <p>各解説者の開幕前順位予想を、実際のシーズン結果と照合してスコアリング。順位差に応じた加減点方式で、セ・パ各リーグの的中率を数値化しています。</p>
            <p>データソース: YouTube予想動画、スポーツ新聞コラム、テレビ・ラジオ番組の開幕前特番など。行をクリックすると予想と実際の比較表が展開されます。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
