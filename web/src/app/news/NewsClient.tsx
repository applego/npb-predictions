"use client";

import { useState } from "react";
import { getTeamByName } from "@/lib/teams";

// ── Types ──

interface NewsItem {
  id: string;
  type: "hit" | "ranking" | "prediction" | "spotlight";
  title: string;
  body: string;
  commentator?: string;
  year?: number;
  timestamp: number;
  icon: string;
  source?: string;
  headline?: string;
  lead?: string;
  bodyParagraphs?: string[];
  quote?: string;
  centralPicks?: string[];
  pacificPicks?: string[];
}

type FilterType = "all" | "hit" | "ranking" | "prediction" | "spotlight";

const FILTER_TABS: { value: FilterType; label: string; icon: string; accent: string }[] = [
  { value: "all",        label: "すべて",       icon: "◉", accent: "var(--stitch)" },
  { value: "hit",        label: "的中速報",      icon: "🎯", accent: "#16a34a" },
  { value: "ranking",    label: "ランキング",    icon: "🏆", accent: "#0284c7" },
  { value: "prediction", label: "新規予想",      icon: "📝", accent: "#7c3aed" },
  { value: "spotlight",  label: "解説者注目",    icon: "🔍", accent: "#c2410c" },
];

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; label: string; badge: string }> = {
  hit: {
    bg: "rgba(22,163,74,0.06)",
    border: "rgba(22,163,74,0.25)",
    text: "#16a34a",
    label: "的中速報",
    badge: "rgba(22,163,74,0.12)",
  },
  ranking: {
    bg: "rgba(2,132,199,0.06)",
    border: "rgba(2,132,199,0.25)",
    text: "#0284c7",
    label: "ランキング",
    badge: "rgba(2,132,199,0.12)",
  },
  prediction: {
    bg: "rgba(124,58,237,0.05)",
    border: "rgba(124,58,237,0.18)",
    text: "#7c3aed",
    label: "新規予想",
    badge: "rgba(124,58,237,0.10)",
  },
  spotlight: {
    bg: "rgba(194,65,12,0.05)",
    border: "rgba(194,65,12,0.2)",
    text: "#c2410c",
    label: "解説者注目",
    badge: "rgba(194,65,12,0.10)",
  },
};

// ── Team Mini Badge ──

function TeamMini({ team, rank }: { team: string; rank: number }) {
  const t = getTeamByName(team);
  if (!t) return <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{team}</span>;
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm text-[9px] font-bold"
      style={{
        background: t.color,
        color: t.textColor,
        padding: "1px 4px",
        minWidth: "1.2rem",
        lineHeight: 1.3,
        textShadow: t.textColor === "#fff" ? "0 0 2px rgba(0,0,0,0.3)" : "none",
      }}
      title={`${rank}位: ${t.shortName}`}
    >
      {t.abbr}
    </span>
  );
}

// ── Shared Badge ──

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_STYLES[type] ?? TYPE_STYLES.prediction;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
      style={{ background: s.badge, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

// ── Hero Card (first / featured item) ──

function HeroCard({ item }: { item: NewsItem }) {
  const s = TYPE_STYLES[item.type] ?? TYPE_STYLES.prediction;

  return (
    <div
      data-testid="news-item"
      data-news-type={item.type}
      data-news-year={item.year}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${s.bg} 0%, var(--bg-surface) 60%)`,
        border: `1px solid ${s.border}`,
      }}
    >
      {/* Top accent stripe */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${s.text}, transparent 60%)` }} />

      <div className="p-6 md:p-8">
        <div className="mb-3 flex items-center gap-3">
          <TypeBadge type={item.type} />
          {item.year && (
            <span className="text-xs font-semibold tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
              {item.year}
            </span>
          )}
          <span className="ml-auto text-xl">{item.icon}</span>
        </div>

        <h2
          className="mb-2 leading-tight"
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.03em",
            color: "var(--text-primary)",
          }}
        >
          {item.title}
        </h2>

        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {item.body}
        </p>

        {item.source && item.source.startsWith("http") && (
          <a
            href={item.source}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all hover:opacity-80"
            style={{ background: s.badge, color: s.text, border: `1px solid ${s.border}` }}
          >
            <span>📎</span> ソースを見る <span style={{ fontSize: "0.6rem" }}>↗</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Newspaper Article Card (for prediction type) ──

function NewspaperCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid="news-item"
      data-news-type={item.type}
      data-news-year={item.year}
      className="overflow-hidden rounded-xl"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
    >
      {/* Top red bar */}
      <div style={{ height: "3px", background: "var(--stitch)" }} />

      <div className="p-5">
        {/* Meta row */}
        <div className="mb-2 flex items-center gap-2">
          <span
            className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: "var(--stitch)", color: "#fff" }}
          >
            📰 予想速報
          </span>
          {item.year && (
            <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
              {item.year}
            </span>
          )}
          {item.source && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              📎 {item.source}
            </span>
          )}
        </div>

        {/* Headline — large, bold, newspaper-style */}
        <h2
          className="mb-3 leading-tight"
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
            fontWeight: 900,
            color: "var(--text-primary)",
            lineHeight: 1.3,
          }}
        >
          {item.headline ?? item.title}
        </h2>

        {/* Lead — bold, slightly larger */}
        {item.lead && (
          <p
            className="mb-3 text-sm font-bold leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {item.lead}
          </p>
        )}

        {/* Team badges */}
        {item.centralPicks && item.centralPicks.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>セ</span>
              {item.centralPicks.map((team, i) => (
                <TeamMini key={`c-${i}`} team={team} rank={i + 1} />
              ))}
            </div>
            {item.pacificPicks && item.pacificPicks.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>パ</span>
                {item.pacificPicks.map((team, i) => (
                  <TeamMini key={`p-${i}`} team={team} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expand/collapse body */}
        {item.bodyParagraphs && item.bodyParagraphs.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mb-2 text-xs font-medium transition-colors"
              style={{ color: "var(--stitch)" }}
            >
              {expanded ? "▲ 閉じる" : "▼ 続きを読む"}
            </button>

            {expanded && (
              <div className="space-y-3">
                {/* Body paragraphs */}
                {item.bodyParagraphs.map((p, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {p}
                  </p>
                ))}

                {/* Quote block */}
                {item.quote && (
                  <blockquote
                    className="rounded-r-lg py-2 pl-4 text-sm italic leading-relaxed"
                    style={{
                      borderLeft: "3px solid var(--stitch)",
                      color: "var(--text-secondary)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    {item.quote}
                  </blockquote>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Standard Card ──

function NewsCard({ item }: { item: NewsItem }) {
  const s = TYPE_STYLES[item.type] ?? TYPE_STYLES.prediction;

  return (
    <div
      data-testid="news-item"
      data-news-type={item.type}
      data-news-year={item.year}
      className="group relative flex gap-3 overflow-hidden rounded-xl p-4 transition-all hover:shadow-sm"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid var(--border-primary)`,
      }}
    >
      {/* Left color bar */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl"
        style={{ background: s.text, opacity: 0.6 }}
      />

      {/* Icon */}
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
        style={{ background: s.badge, border: `1px solid ${s.border}` }}
      >
        {item.icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <TypeBadge type={item.type} />
          {item.year && (
            <span
              className="text-[10px] font-semibold tracking-widest"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}
            >
              {item.year}
            </span>
          )}
        </div>

        <h3
          className="text-sm font-semibold leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {item.title}
        </h3>

        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {item.body}
        </p>

        {/* Team picks for prediction type */}
        {item.type === "prediction" && item.centralPicks && item.centralPicks.length > 0 && (
          <div className="mt-2 flex gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold" style={{ color: "var(--text-muted)" }}>セ</span>
              {item.centralPicks.map((team, i) => (
                <TeamMini key={`c-${i}`} team={team} rank={i + 1} />
              ))}
            </div>
            {item.pacificPicks && item.pacificPicks.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold" style={{ color: "var(--text-muted)" }}>パ</span>
                {item.pacificPicks.map((team, i) => (
                  <TeamMini key={`p-${i}`} team={team} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {item.source && !item.source.startsWith("http") && item.source !== "直接入力" && (
          <span className="mt-1 inline-block text-[10px]" style={{ color: "var(--text-muted)" }}>
            📎 {item.source}
          </span>
        )}
        {item.source && item.source.startsWith("http") && (
          <a
            href={item.source}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] transition-colors hover:underline"
            style={{ color: s.text, opacity: 0.75 }}
          >
            📎 ソース ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ── Stats Bar ──

function StatsBar({ items }: { items: NewsItem[] }) {
  const stats = [
    { label: "的中速報", count: items.filter((i) => i.type === "hit").length, color: "#16a34a", icon: "🎯" },
    { label: "ランキング", count: items.filter((i) => i.type === "ranking").length, color: "#0284c7", icon: "🏆" },
    { label: "新規予想", count: items.filter((i) => i.type === "prediction").length, color: "#7c3aed", icon: "📝" },
    { label: "注目解説者", count: items.filter((i) => i.type === "spotlight").length, color: "#c2410c", icon: "🔍" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 rounded-xl p-4"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <span className="text-xl">{s.icon}</span>
          <div>
            <p
              className="text-xl font-black leading-none tabular-nums"
              style={{ color: s.color, fontFamily: "var(--font-display)" }}
            >
              {s.count}
            </p>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Client Component ──

export function NewsClient({ items }: { items: NewsItem[] }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);
  const PAGE_SIZE = 12;
  const displayed = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hasMore = filtered.length > PAGE_SIZE && !showAll;

  const hero = displayed[0];
  const rest = displayed.slice(1);

  return (
    <div className="space-y-6">

      {/* Stats */}
      <StatsBar items={items} />

      {/* Filter Tabs */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
      >
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.value;
            const count = tab.value === "all"
              ? items.length
              : items.filter((i) => i.type === tab.value).length;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => { setFilter(tab.value); setShowAll(false); }}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.08em",
                  background: active ? `${tab.accent}18` : "transparent",
                  border: active ? `1.5px solid ${tab.accent}50` : "1.5px solid var(--border-primary)",
                  color: active ? tab.accent : "var(--text-secondary)",
                  boxShadow: active ? `0 0 0 1px ${tab.accent}20` : "none",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-black tabular-nums"
                  style={{
                    background: active ? `${tab.accent}25` : "var(--border-primary)",
                    color: active ? tab.accent : "var(--text-muted)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Count label */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {filtered.length}件中 {Math.min(displayed.length, filtered.length)}件を表示
        </p>
        <span
          className="text-xs tracking-widest"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)", letterSpacing: "0.2em" }}
        >
          ACTIVITY FEED
        </span>
      </div>

      {displayed.length === 0 ? (
        <div
          data-testid="news-empty-state"
          className="rounded-2xl p-12 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            該当するニュースがありません
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hero */}
          {hero && (hero.type === "prediction" ? <NewspaperCard item={hero} /> : <HeroCard item={hero} />)}

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {rest.map((item) =>
                item.type === "prediction"
                  ? <NewspaperCard key={item.id} item={item} />
                  : <NewsCard key={item.id} item={item} />
              )}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="rounded-full px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-80"
                style={{
                  background: "var(--bg-surface)",
                  border: "1.5px solid var(--border-primary)",
                  color: "var(--text-secondary)",
                }}
              >
                さらに {filtered.length - PAGE_SIZE} 件を見る ↓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Compact version for homepage ──

export function NewsCompact({ items }: { items: NewsItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const s = TYPE_STYLES[item.type] ?? TYPE_STYLES.prediction;

        return (
          <div
            key={item.id}
            className="relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 transition-all"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-primary)",
            }}
          >
            {/* Left color bar */}
            <div
              aria-hidden="true"
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{ background: s.text, opacity: 0.7 }}
            />

            {/* Icon */}
            <span className="shrink-0 text-base">{item.icon}</span>

            {/* Title */}
            <p
              className="min-w-0 flex-1 truncate text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {item.title}
            </p>

            {/* Type + Year */}
            <div className="ml-2 flex shrink-0 items-center gap-2">
              <TypeBadge type={item.type} />
              {item.year && (
                <span
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}
                >
                  {item.year}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
