"use client";

import { useState } from "react";

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
}

type FilterType = "all" | "hit" | "ranking" | "prediction" | "spotlight";

const FILTER_TABS: { value: FilterType; label: string; accent: string }[] = [
  { value: "all", label: "ALL", accent: "#fbbf24" },
  { value: "hit", label: "的中", accent: "#4ade80" },
  { value: "ranking", label: "ランキング", accent: "#38bdf8" },
  { value: "prediction", label: "予想", accent: "#c084fc" },
  { value: "spotlight", label: "注目", accent: "#fb923c" },
];

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  hit: {
    bg: "rgba(74,222,128,0.06)",
    border: "rgba(74,222,128,0.2)",
    text: "#4ade80",
  },
  ranking: {
    bg: "rgba(56,189,248,0.06)",
    border: "rgba(56,189,248,0.2)",
    text: "#38bdf8",
  },
  prediction: {
    bg: "rgba(192,132,252,0.06)",
    border: "rgba(192,132,252,0.2)",
    text: "#c084fc",
  },
  spotlight: {
    bg: "rgba(251,146,60,0.06)",
    border: "rgba(251,146,60,0.2)",
    text: "#fb923c",
  },
};

const TYPE_LABELS: Record<string, string> = {
  hit: "的中速報",
  ranking: "ランキング",
  prediction: "新規予想",
  spotlight: "解説者注目",
};

// ── Components ──

function NewsCard({ item }: { item: NewsItem }) {
  const colors = TYPE_COLORS[item.type] ?? TYPE_COLORS.prediction;

  return (
    <div
      className="group relative overflow-hidden rounded-xl transition-all"
      style={{
        background: "#0a1525",
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Left accent bar */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{
          background: `linear-gradient(to bottom, ${colors.text}, ${colors.border} 70%, transparent)`,
        }}
      />

      <div className="relative flex gap-4 p-5">
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
          }}
        >
          {item.icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Type badge + Year */}
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            >
              {TYPE_LABELS[item.type]}
            </span>
            {item.year && (
              <span
                className="font-display text-xs"
                style={{
                  fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.1em",
                }}
              >
                {item.year}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-sm font-medium leading-snug"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {item.title}
          </h3>

          {/* Body */}
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {item.body}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Client Component ──

export function NewsClient({ items }: { items: NewsItem[] }) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all" ? items : items.filter((item) => item.type === filter);

  // Count per type
  const counts: Record<FilterType, number> = {
    all: items.length,
    hit: items.filter((i) => i.type === "hit").length,
    ranking: items.filter((i) => i.type === "ranking").length,
    prediction: items.filter((i) => i.type === "prediction").length,
    spotlight: items.filter((i) => i.type === "spotlight").length,
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "#0a1525",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className="rounded px-3 py-1.5 text-xs font-medium tracking-wider transition-all"
                style={{
                  fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  letterSpacing: "0.12em",
                  background: active ? `${tab.accent}12` : "rgba(255,255,255,0.03)",
                  border: active
                    ? `1px solid ${tab.accent}40`
                    : "1px solid rgba(255,255,255,0.08)",
                  color: active ? tab.accent : "rgba(255,255,255,0.4)",
                }}
              >
                {tab.label}
                <span
                  className="ml-1.5 text-[10px]"
                  style={{ opacity: 0.6 }}
                >
                  {counts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
          {filtered.length}件のニュース
        </p>
        <span
          className="font-display text-xs tracking-widest"
          style={{
            fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            color: "rgba(255,255,255,0.15)",
            letterSpacing: "0.2em",
          }}
        >
          ACTIVITY FEED
        </span>
      </div>

      {/* News Cards */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
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
              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              letterSpacing: "0.1em",
            }}
          >
            NO NEWS
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            該当するニュースがありません
          </p>
        </div>
      )}
    </div>
  );
}

// ── Compact version for homepage ──

export function NewsCompact({ items }: { items: NewsItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const colors = TYPE_COLORS[item.type] ?? TYPE_COLORS.prediction;

        return (
          <div
            key={item.id}
            className="relative overflow-hidden rounded-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {/* Left accent */}
            <div
              aria-hidden="true"
              className="absolute left-0 top-0 h-full w-[2px]"
              style={{ background: colors.text }}
            />

            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-base">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {item.title}
                </p>
              </div>
              {item.year && (
                <span
                  className="font-display shrink-0 text-xs"
                  style={{
                    fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                    color: "rgba(255,255,255,0.2)",
                    letterSpacing: "0.08em",
                  }}
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
