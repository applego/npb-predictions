"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AVAILABLE_YEARS,
  TOTAL_COMMENTATOR_COUNT,
  SOURCE_BADGE_COLORS,
  getFilteredCommentators,
  type LeagueFilter,
  type SortKey,
  type CommentatorScore,
  type SourceBadge,
} from "@/lib/mock-commentator-data";

// ── Year filter tabs ──

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

function SourceBadgeChip({ source }: { source: SourceBadge }) {
  const colors = SOURCE_BADGE_COLORS[source];
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      {source}
    </span>
  );
}

// ── Tab Button ──

function TabButton({
  active,
  onClick,
  children,
  accentColor = "#fbbf24",
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
        background: active ? `${accentColor}12` : "rgba(255,255,255,0.03)",
        border: active
          ? `1px solid ${accentColor}40`
          : "1px solid rgba(255,255,255,0.08)",
        color: active ? accentColor : "rgba(255,255,255,0.4)",
      }}
    >
      {children}
    </button>
  );
}

// ── Leaderboard Row ──

function LeaderboardRow({
  entry,
  rank,
  league,
}: {
  entry: CommentatorScore;
  rank: number;
  league: LeagueFilter;
}) {
  const isTop3 = rank < 3;
  const isFirst = rank === 0;
  const rankLabel = getRankDisplay(rank);

  return (
    <tr
      className="transition-colors"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: isFirst ? "rgba(251,191,36,0.04)" : "transparent",
      }}
    >
      {/* Rank */}
      <td className="px-3 py-3 text-center sm:px-4">
        <span
          className="font-display text-base"
          style={{
            fontFamily:
              "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            color: isTop3 ? "#fbbf24" : "rgba(255,255,255,0.4)",
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
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            {entry.name}
          </Link>
          <SourceBadgeChip source={entry.source} />
        </div>
      </td>

      {/* Central score — hide when filtered to pacific only */}
      {league !== "pacific" && (
        <td className="hidden px-3 py-3 text-right sm:table-cell sm:px-4">
          <span
            className="font-display tabular-nums text-base"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color:
                entry.centralScore > 0
                  ? "#fbbf24"
                  : entry.centralScore < 0
                    ? "rgba(239,68,68,0.7)"
                    : "rgba(255,255,255,0.3)",
            }}
          >
            {fmtScore(entry.centralScore)}
          </span>
        </td>
      )}

      {/* Pacific score — hide when filtered to central only */}
      {league !== "central" && (
        <td className="hidden px-3 py-3 text-right sm:table-cell sm:px-4">
          <span
            className="font-display tabular-nums text-base"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color:
                entry.pacificScore > 0
                  ? "#fbbf24"
                  : entry.pacificScore < 0
                    ? "rgba(239,68,68,0.7)"
                    : "rgba(255,255,255,0.3)",
            }}
          >
            {fmtScore(entry.pacificScore)}
          </span>
        </td>
      )}

      {/* Total */}
      <td className="px-3 py-3 text-right sm:px-4">
        <span
          className="inline-block rounded px-3 py-1 font-display tabular-nums text-base"
          style={{
            fontFamily:
              "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            background: isFirst
              ? "rgba(251,191,36,0.12)"
              : "rgba(255,255,255,0.05)",
            color: isFirst ? "#fbbf24" : "rgba(255,255,255,0.7)",
            border: isFirst
              ? "1px solid rgba(251,191,36,0.25)"
              : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {fmtScore(entry.totalScore)}
        </span>
      </td>
    </tr>
  );
}

// ── Main Client Component ──

export function CommentatorRankingsClient() {
  const [year, setYear] = useState<YearOption>(2025);
  const [league, setLeague] = useState<LeagueFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("score");

  const filtered = useMemo(
    () => getFilteredCommentators(year, league, search, sort),
    [year, league, search, sort],
  );

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
      {/* ══════════ Page Header ══════════ */}
      <div>
        <h1
          className="leading-none"
          style={{
            fontFamily:
              "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          COMMENTATOR{" "}
          <span className="animate-amber-glow" style={{ color: "#fbbf24" }}>
            RANKINGS
          </span>
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          プロ野球解説者 的中率ランキング
        </p>
      </div>

      {/* ══════════ Controls ══════════ */}
      <div
        className="space-y-4 rounded-xl p-4 sm:p-5"
        style={{
          background: "#0a1525",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Year Tabs */}
        <div>
          <div
            className="mb-2 text-[10px] font-medium uppercase tracking-widest"
            style={{
              color: "rgba(255,255,255,0.25)",
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
                onClick={() => setYear(tab.value)}
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
                color: "rgba(255,255,255,0.25)",
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
                  onClick={() => setLeague(tab.value)}
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
                color: "rgba(255,255,255,0.25)",
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
                color: "rgba(255,255,255,0.25)",
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
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.8)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ══════════ Stats Bar ══════════ */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
          {filtered.length > 0 ? (
            <>
              {filtered.length}人表示 /{" "}
              <span style={{ color: "rgba(251,191,36,0.6)" }}>
                {TOTAL_COMMENTATOR_COUNT}人
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
            color: "rgba(255,255,255,0.15)",
            letterSpacing: "0.2em",
          }}
        >
          {year === "all" ? "ALL TIME" : year}
        </span>
      </div>

      {/* ══════════ Leaderboard Table ══════════ */}
      {filtered.length > 0 ? (
        <div
          className="overflow-x-auto rounded-xl"
          style={{
            background: "#0a1525",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {headerCols.map((col) => (
                  <th
                    key={col.label}
                    className={`px-3 py-3 text-xs font-medium uppercase tracking-widest sm:px-4 ${col.align} ${col.hideMobile ? "hidden sm:table-cell" : ""}`}
                    style={{
                      color: "rgba(255,255,255,0.3)",
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
                  key={entry.name}
                  entry={entry}
                  rank={idx}
                  league={league}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="rounded-xl p-10 text-center"
          style={{
            background: "#0a1525",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p
            className="font-display mb-2 text-sm"
            style={{
              color: "rgba(255,255,255,0.4)",
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              letterSpacing: "0.1em",
            }}
          >
            NO RESULTS
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            検索条件を変更してください
          </p>
        </div>
      )}

      {/* ══════════ Legend ══════════ */}
      <section
        className="rounded-xl p-5"
        style={{
          background: "#0a1525",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="h-px flex-1"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <span
            className="font-display shrink-0 text-xs"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color: "rgba(251,191,36,0.5)",
              letterSpacing: "0.25em",
            }}
          >
            ABOUT THIS RANKING
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        </div>
        <div
          className="mt-4 space-y-2 text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <p>
            各解説者の開幕前順位予想を、実際のシーズン結果と照合してスコアリング。
            順位差に応じた加減点方式で、セ・パ各リーグの的中率を数値化しています。
          </p>
          <p>
            データソース: YouTube予想動画、スポーツ新聞コラム、テレビ・ラジオ番組の開幕前特番など。
          </p>
        </div>
      </section>
    </div>
  );
}
