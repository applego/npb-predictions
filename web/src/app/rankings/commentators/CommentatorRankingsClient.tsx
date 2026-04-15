"use client";

import { useState, useEffect, useCallback } from "react";
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

// ── Source Badge Chip ──

function SourceBadgeChip({ source }: { source: string | null }) {
  const colors = getSourceBadgeColors(source);
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      {source ?? "その他"}
    </span>
  );
}

// ── Tab Button ──

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
      className="rounded px-3 py-1.5 text-xs font-medium tracking-wider transition-all"
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
            <th
              className="px-2 py-1.5 text-left"
              style={{ color: "var(--text-muted)", width: "3rem" }}
            >
              順位
            </th>
            <th
              className="px-2 py-1.5 text-left"
              style={{ color: "var(--text-muted)" }}
            >
              予想
            </th>
            <th
              className="px-2 py-1.5 text-left"
              style={{ color: "var(--text-muted)" }}
            >
              実際
            </th>
            <th
              className="px-2 py-1.5 text-right"
              style={{ color: "var(--text-muted)", width: "5.5rem" }}
            >
              結果
            </th>
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
                  background: isCorrect
                    ? "rgba(74,222,128,0.04)"
                    : "transparent",
                }}
              >
                <td
                  className="px-2 py-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {detail.rank}位
                </td>
                <td
                  className="px-2 py-1.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {detail.predictedTeam}
                </td>
                <td
                  className="px-2 py-1.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {detail.actualTeam || "---"}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium"
                    style={{ color: diffInfo.color }}
                  >
                    {isCorrect ? (
                      <>
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                        {diffInfo.text}
                      </>
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

function ExpandedDetail({
  entry,
}: {
  entry: CommentatorData;
}) {
  return (
    <tr>
      <td
        colSpan={5}
        style={{
          background: "var(--bg-inset)",
          borderBottom: "1px solid color-mix(in srgb, var(--stitch) 10%, transparent)",
        }}
      >
        <div className="space-y-4 px-4 py-4 sm:px-6">
          {/* Score breakdown */}
          <div
            className="flex flex-wrap gap-4 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            <span>
              順位予想:{" "}
              <span style={{ color: "var(--stitch)" }}>{fmtScore(entry.rankingScore)}pt</span>
            </span>
            <span>
              タイトル予想:{" "}
              <span style={{ color: "var(--stitch)" }}>{fmtScore(entry.titleScore)}pt</span>
            </span>
            <span>
              合計:{" "}
              <span style={{ color: "var(--stitch)", fontWeight: 600 }}>
                {fmtScore(entry.totalScore)}pt
              </span>
            </span>
          </div>

          {/* Prediction vs Actual tables */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PredictionVsActualTable
              league="セ・リーグ"
              details={entry.centralDetails}
            />
            <PredictionVsActualTable
              league="パ・リーグ"
              details={entry.pacificDetails}
            />
          </div>

          {/* Variant info if present */}
          {entry.variant && (
            <div
              className="text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
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
}: {
  entry: CommentatorData;
  rank: number;
  league: LeagueFilter;
  isExpanded: boolean;
  onToggle: () => void;
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
          borderBottom: isExpanded
            ? "none"
            : "1px solid var(--border-primary)",
          background: isFirst
            ? "rgba(229,57,53,0.04)"
            : isExpanded
              ? "rgba(229,57,53,0.02)"
              : "transparent",
        }}
      >
        {/* Rank */}
        <td className="px-3 py-3 text-center sm:px-4">
          <span
            className="font-display text-base"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color: isTop3 ? "var(--stitch)" : "var(--text-secondary)",
              fontSize: isTop3 ? "1.25rem" : undefined,
            }}
          >
            {rankLabel}
          </span>
        </td>

        {/* Name + Source */}
        <td className="px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/rankings/commentators/${entry.slug}`}
              className="font-medium transition-colors hover:text-amber-400"
              style={{ color: "var(--text-primary)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {entry.name}
            </Link>
            <SourceBadgeChip source={entry.source} />
          </div>
        </td>

        {/* Central score */}
        {league !== "pacific" && (
          <td className="hidden px-3 py-3 text-right sm:table-cell sm:px-4">
            <span
              className="font-display tabular-nums text-base"
              style={{
                fontFamily:
                  "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color:
                  entry.centralScore > 0
                    ? "var(--stitch)"
                    : entry.centralScore < 0
                      ? "var(--stitch)"
                      : "var(--text-muted)",
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
                fontFamily:
                  "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color:
                  entry.pacificScore > 0
                    ? "var(--stitch)"
                    : entry.pacificScore < 0
                      ? "var(--stitch)"
                      : "var(--text-muted)",
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
                fontFamily:
                  "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                background: isFirst
                  ? "rgba(229,57,53,0.12)"
                  : "var(--border-primary)",
                color: isFirst ? "var(--stitch)" : "var(--text-secondary)",
                border: isFirst
                  ? "1px solid rgba(229,57,53,0.25)"
                  : "1px solid var(--border-primary)",
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
          style={{
            background: "var(--border-primary)",
            animationDelay: `${i * 80}ms`,
          }}
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

  // Fetch data from API
  const fetchData = useCallback(async (y: YearOption, l: LeagueFilter) => {
    // "all" years aggregation is not supported by the API; fetch each year
    if (y === "all") {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          AVAILABLE_YEARS.map(async (yr) => {
            const res = await fetch(
              `/api/rankings/commentators?year=${yr}&league=${l}`
            );
            if (!res.ok) return null;
            return (await res.json()) as CommentatorRankingsResponse;
          })
        );

        // Aggregate scores across years
        const aggregated = new Map<
          number,
          CommentatorData
        >();
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
              // Keep details from the latest year only
              if (c.centralDetails.length > 0) {
                existing.centralDetails = c.centralDetails;
              }
              if (c.pacificDetails.length > 0) {
                existing.pacificDetails = c.pacificDetails;
              }
            } else {
              aggregated.set(c.userId, { ...c });
            }
          }
        }

        const sorted = Array.from(aggregated.values()).sort(
          (a, b) => b.effectiveTotal - a.effectiveTotal
        );
        sorted.forEach((c, idx) => {
          c.rank = idx + 1;
        });

        setData({
          season: { id: 0, year: 0 },
          league: l,
          actualCentral: results.find((r) => r)?.actualCentral ?? [],
          actualPacific: results.find((r) => r)?.actualPacific ?? [],
          totalCommentators: sorted.length,
          commentators: sorted,
        });
      } catch (err) {
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rankings/commentators?year=${y}&league=${l}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { error?: string }).error ?? `Error ${res.status}`
        );
        setData(null);
        return;
      }
      const json = (await res.json()) as CommentatorRankingsResponse;
      setData(json);
    } catch (err) {
      setError("データの取得に失敗しました");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(year, league);
  }, [year, league, fetchData]);

  // Client-side filtering for search + sort (data is already league-filtered)
  const filtered = data
    ? (() => {
        let pool = [...data.commentators];

        // Search
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          pool = pool.filter((c) => c.name.toLowerCase().includes(q));
        }

        // Sort
        if (sort === "name") {
          pool.sort((a, b) => a.name.localeCompare(b.name, "ja"));
        }
        // "score" is default from API

        return pool;
      })()
    : [];

  // Build table header columns based on league filter
  const headerCols: { label: string; align: string; hideMobile?: boolean }[] = [
    { label: "順位", align: "text-center" },
    { label: "解説者", align: "text-left" },
  ];
  if (league !== "pacific") {
    headerCols.push({ label: "セ", align: "text-right", hideMobile: true });
  }
  if (league !== "central") {
    headerCols.push({ label: "パ", align: "text-right", hideMobile: true });
  }
  headerCols.push({ label: "合計", align: "text-right" });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1
          className="leading-none"
          style={{
            fontFamily:
              "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
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
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          プロ野球解説者 的中率ランキング
        </p>
      </div>

      {/* Controls */}
      <div
        className="space-y-4 rounded-xl p-4 sm:p-5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-primary)",
        }}
      >
        {/* Year Tabs */}
        <div>
          <div
            className="mb-2 text-[10px] font-medium uppercase tracking-widest"
            style={{
              color: "var(--text-muted)",
              letterSpacing: "0.18em",
            }}
          >
            YEAR
          </div>
          <div className="flex flex-wrap gap-2">
            {YEAR_TABS.map((tab) => (
              <TabButton
                key={tab.value}
                active={year === tab.value}
                onClick={() => {
                  setYear(tab.value);
                  setExpandedId(null);
                }}
              >
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>

        {/* League + Sort + Search row */}
        <div className="flex flex-wrap items-end gap-4">
          {/* League filter */}
          <div>
            <div
              className="mb-2 text-[10px] font-medium uppercase tracking-widest"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.18em",
              }}
            >
              LEAGUE
            </div>
            <div className="flex flex-wrap gap-2">
              {LEAGUE_TABS.map((tab) => (
                <TabButton
                  key={tab.value}
                  active={league === tab.value}
                  onClick={() => {
                    setLeague(tab.value);
                    setExpandedId(null);
                  }}
                  accentColor="#38bdf8"
                >
                  {tab.label}
                </TabButton>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <div
              className="mb-2 text-[10px] font-medium uppercase tracking-widest"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.18em",
              }}
            >
              SORT
            </div>
            <div className="flex gap-2">
              {SORT_OPTIONS.map((opt) => (
                <TabButton
                  key={opt.value}
                  active={sort === opt.value}
                  onClick={() => setSort(opt.value)}
                  accentColor="#34d399"
                >
                  {opt.label}
                </TabButton>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="ml-auto w-full sm:w-auto">
            <div
              className="mb-2 text-[10px] font-medium uppercase tracking-widest"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.18em",
              }}
            >
              SEARCH
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="解説者名で検索..."
              className="w-full rounded px-3 py-1.5 text-sm outline-none transition-all sm:w-56"
              style={{
                background: "var(--border-primary)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {loading ? (
            "読み込み中..."
          ) : error ? (
            <span style={{ color: "var(--stitch)" }}>{error}</span>
          ) : filtered.length > 0 ? (
            <>
              {filtered.length}人表示 /{" "}
              <span style={{ color: "rgba(229,57,53,0.6)" }}>
                {data?.totalCommentators ?? 0}人
              </span>
              の解説者が参加
            </>
          ) : (
            "該当する解説者が見つかりません"
          )}
        </p>
        <span
          className="font-display text-xs tracking-widest"
          style={{
            fontFamily:
              "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            color: "var(--text-muted)",
            letterSpacing: "0.2em",
          }}
        >
          {year === "all" ? "ALL TIME" : year}
        </span>
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length > 0 ? (
        <div
          className="overflow-x-auto rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-primary)",
                }}
              >
                {headerCols.map((col) => (
                  <th
                    key={col.label}
                    className={`px-3 py-3 text-xs font-medium uppercase tracking-widest sm:px-4 ${col.align} ${col.hideMobile ? "hidden sm:table-cell" : ""}`}
                    style={{
                      color: "var(--text-muted)",
                      letterSpacing: "0.14em",
                    }}
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
                  onToggle={() =>
                    setExpandedId(
                      expandedId === entry.userId ? null : entry.userId
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : !error ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <p
            className="font-display mb-2 text-sm"
            style={{
              color: "var(--text-secondary)",
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              letterSpacing: "0.1em",
            }}
          >
            NO RESULTS
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            検索条件を変更してください
          </p>
        </div>
      ) : null}

      {/* Legend */}
      <section
        className="rounded-xl p-5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-primary)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="h-px flex-1"
            style={{ background: "var(--border-primary)" }}
          />
          <span
            className="font-display shrink-0 text-xs"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color: "rgba(229,57,53,0.5)",
              letterSpacing: "0.25em",
            }}
          >
            ABOUT THIS RANKING
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "var(--border-primary)" }}
          />
        </div>

        {/* Scoring legend */}
        <div className="mt-4 space-y-3">
          <div
            className="flex flex-wrap gap-3 text-[11px]"
            style={{ color: "var(--text-secondary)" }}
          >
            <span>
              <span style={{ color: "#4ade80" }}>的中 +5</span> = 完全一致
            </span>
            <span>
              <span style={{ color: "#86efac" }}>1差 +3</span>
            </span>
            <span>
              <span style={{ color: "var(--stitch)" }}>2差 +1</span>
            </span>
            <span>
              <span style={{ color: "#fb923c" }}>3差 -1</span>
            </span>
            <span>
              <span style={{ color: "#f87171" }}>4差 -3</span>
            </span>
            <span>
              <span style={{ color: "#ef4444" }}>5差 -5</span>
            </span>
          </div>

          <div
            className="space-y-2 text-sm leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            <p>
              各解説者の開幕前順位予想を、実際のシーズン結果と照合してスコアリング。
              順位差に応じた加減点方式で、セ・パ各リーグの的中率を数値化しています。
            </p>
            <p>
              データソース:
              YouTube予想動画、スポーツ新聞コラム、テレビ・ラジオ番組の開幕前特番など。
              行をクリックすると予想と実際の比較表が展開されます。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
