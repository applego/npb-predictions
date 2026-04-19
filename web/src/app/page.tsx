export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { Season } from "@/lib/types";
import {
  canonicalAlternates,
  clampDescription,
  socialPreview,
} from "@/lib/seo-meta";

const HOME_TITLE = "NPB予想リーグ — プロ野球順位予想リーグ";
const HOME_DESCRIPTION = clampDescription(
  "プロ野球の順位予想・タイトル予想で年間王者を競うリーグ。セ・パ両リーグの予想を比較し、スコアボードで的中率や得点を追跡できます。"
);

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  ...socialPreview({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    pathname: "/",
  }),
  alternates: canonicalAlternates("/"),
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function getSeasons(): Promise<Season[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json() as Promise<Season[]>;
  } catch {
    return [];
  }
}

const RANKING_RULES = [
  { diff: "完全一致", score: "+5" },
  { diff: "1位差",   score: "+3" },
  { diff: "2位差",   score: "+1" },
  { diff: "3位差",   score: "−1" },
  { diff: "4位差",   score: "−3" },
  { diff: "5位差",   score: "−5" },
];

const AWARDS = [
  { icon: "🥇", label: "前半戦王者" },
  { icon: "📅", label: "月間王者" },
  { icon: "⚔️", label: "交流戦王者" },
  { icon: "🎯", label: "一人勝ちタイトル賞" },
  { icon: "🎲", label: "大穴賞" },
];

const NAV_CARDS = [
  {
    num: "01",
    href: "/standings",
    label: "Current Standings",
    sub: "リアルタイムのスコアボード・順位確認",
    accent: "#fbbf24",
    accentBg: "rgba(251,191,36,0.06)",
    accentBorder: "rgba(251,191,36,0.25)",
    accentNum: "rgba(251,191,36,0.5)",
    accentBar: "linear-gradient(to bottom, #fbbf24, rgba(251,191,36,0.2) 70%, transparent)",
    accentHover: "linear-gradient(135deg, rgba(251,191,36,0.04) 0%, transparent 60%)",
  },
  {
    num: "02",
    href: "/predictions",
    label: "Predictions Compare",
    sub: "全員の予想を横並び比較",
    accent: "#38bdf8",
    accentBg: "rgba(56,189,248,0.06)",
    accentBorder: "rgba(56,189,248,0.25)",
    accentNum: "rgba(56,189,248,0.5)",
    accentBar: "linear-gradient(to bottom, #38bdf8, rgba(56,189,248,0.2) 70%, transparent)",
    accentHover: "linear-gradient(135deg, rgba(56,189,248,0.04) 0%, transparent 60%)",
  },
  {
    num: "03",
    href: "/predictions/new",
    label: "予想を登録する",
    sub: "今すぐ順位・タイトル予想を入力",
    accent: "#34d399",
    accentBg: "rgba(52,211,153,0.06)",
    accentBorder: "rgba(52,211,153,0.25)",
    accentNum: "rgba(52,211,153,0.5)",
    accentBar: "linear-gradient(to bottom, #34d399, rgba(52,211,153,0.2) 70%, transparent)",
    accentHover: "linear-gradient(135deg, rgba(52,211,153,0.04) 0%, transparent 60%)",
  },
];

export default async function HomePage() {
  const seasons = await getSeasons();
  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const year = activeSeason?.year ?? new Date().getFullYear();

  return (
    <div className="space-y-8">
      {/* ══════════ HERO ══════════ */}
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, #0a1525 0%, #0d1b30 60%, #0a1220 100%)",
          border: "1px solid rgba(251,191,36,0.08)",
        }}
      >
        {/* Corner glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,1) 0%, transparent 70%)",
          }}
        />

        {/* Left amber stripe */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{
            background:
              "linear-gradient(to bottom, #fbbf24, rgba(251,191,36,0.4) 60%, transparent)",
          }}
        />

        {/* Diamond pattern top-right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-6 opacity-5"
          style={{ fontSize: "7rem", lineHeight: 1, userSelect: "none" }}
        >
          ⬟
        </div>

        <div className="relative px-8 py-10 sm:px-12">
          {/* Ghost year */}
          <div
            aria-hidden="true"
            className="font-display select-none leading-none"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              fontSize: "clamp(4rem, 14vw, 9rem)",
              color: "rgba(251,191,36,0.06)",
              letterSpacing: "0.08em",
              lineHeight: 0.85,
              marginBottom: "-0.2em",
              marginLeft: "-0.02em",
            }}
          >
            {year}
          </div>

          {/* Main heading */}
          <h1
            className="font-display leading-none"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              letterSpacing: "0.06em",
            }}
          >
            <span
              className="block"
              style={{
                fontSize: "clamp(2rem, 7vw, 4.5rem)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              NPB{" "}
              <span
                className="animate-amber-glow"
                style={{ color: "#fbbf24" }}
              >
                PREDICTIONS
              </span>
            </span>
            <span
              className="block"
              style={{
                fontSize: "clamp(1.25rem, 4vw, 2.5rem)",
                color: "rgba(255,255,255,0.5)",
                marginTop: "0.05em",
              }}
            >
              LEAGUE
            </span>
          </h1>

          {/* Japanese subtitle */}
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            プロ野球順位予想リーグ — セ・パ両リーグの順位とタイトルを予想して年間王者を目指せ
          </p>

          {/* Season badge */}
          {activeSeason && (
            <div
              className="mt-5 inline-flex items-center gap-2 rounded px-3 py-1.5"
              style={{
                border: "1px solid rgba(251,191,36,0.25)",
                background: "rgba(251,191,36,0.06)",
              }}
            >
              <span
                className="animate-pulse-dot h-1.5 w-1.5 rounded-full"
                style={{ background: "#fbbf24", display: "inline-block" }}
              />
              <span
                className="font-display text-xs"
                style={{
                  color: "#fbbf24",
                  fontFamily:
                    "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  letterSpacing: "0.2em",
                }}
              >
                {activeSeason.label} — SEASON ACTIVE
              </span>
            </div>
          )}

          {/* CTA buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/standings"
              className="inline-flex items-center gap-2 rounded px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                border: "1px solid rgba(251,191,36,0.3)",
                background: "rgba(251,191,36,0.08)",
                color: "#fbbf24",
              }}
              >
              STANDINGS →
            </Link>
            <Link
              href="/predictions"
              className="inline-flex items-center gap-2 rounded px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              PREDICTIONS →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ NAV CARDS ══════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NAV_CARDS.map(({ num, href, label, sub, accent, accentNum, accentBar, accentHover }) => (
          <Link
            key={href}
            href={href}
            className="group relative overflow-hidden rounded-xl transition-all"
            style={{
              background: "#0a1525",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {/* Left accent bar */}
            <div
              aria-hidden="true"
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{ background: accentBar }}
            />

            {/* Hover glow overlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ background: accentHover }}
            />

            <div className="relative p-6">
              {/* Number */}
              <div
                className="mb-2 text-4xl leading-none"
                style={{
                  fontFamily:
                    "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  color: accentNum,
                  letterSpacing: "0.05em",
                }}
              >
                {num}
              </div>

              <h2
                className="font-semibold"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {label}
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {sub}
              </p>

              <div
                className="mt-5 text-xs font-medium tracking-widest opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: accent, letterSpacing: "0.15em" }}
              >
                VIEW →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ══════════ SCORE RULES ══════════ */}
      <section
        className="overflow-hidden rounded-xl"
        style={{
          background: "#0a1525",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Section header */}
        <div
          className="flex items-center gap-4 px-6 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="h-px flex-1"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <span
            className="font-display text-xs"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color: "rgba(251,191,36,0.5)",
              letterSpacing: "0.25em",
            }}
          >
            SCORE RULES
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        </div>

        <div className="grid sm:grid-cols-3">
          {/* Ranking points */}
          <div
            className="p-6"
            style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
          >
            <h3
              className="mb-4 text-xs font-medium tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em" }}
            >
              順位予想得点
            </h3>
            <div className="space-y-2">
              {RANKING_RULES.map(({ diff, score }) => {
                const isPositive = score.startsWith("+");
                return (
                  <div
                    key={diff}
                    className="flex items-center justify-between"
                  >
                    <span
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {diff}
                    </span>
                    <span
                      className="font-display text-base tabular-nums animate-flicker"
                      style={{
                        fontFamily:
                          "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                        color: isPositive
                          ? "#fbbf24"
                          : "rgba(239,68,68,0.7)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {score}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Title points */}
          <div
            className="p-6"
            style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
          >
            <h3
              className="mb-4 text-xs font-medium tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em" }}
            >
              タイトル予想得点
            </h3>
            <div className="flex items-end justify-between">
              <span
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                的中
              </span>
              <span
                className="font-display text-4xl leading-none animate-amber-glow"
                style={{
                  fontFamily:
                    "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  color: "#fbbf24",
                  letterSpacing: "0.05em",
                }}
              >
                +3
              </span>
            </div>
            <p
              className="mt-5 text-xs leading-relaxed"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              打率 · 打点 · 本塁打
              <br />
              最多勝 · 防御率 · セーブ
            </p>
          </div>

          {/* Awards */}
          <div className="p-6">
            <h3
              className="mb-4 text-xs font-medium tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em" }}
            >
              副賞
            </h3>
            <div className="space-y-2.5">
              {AWARDS.map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ YOUTUBE BANNER ══════════ */}
      <section
        className="relative overflow-hidden rounded-xl"
        style={{
          background: "#0a1525",
          border: "1px solid rgba(239,68,68,0.15)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(239,68,68,0.05) 0%, transparent 50%)",
          }}
        />

        {/* Left red stripe */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{
            background:
              "linear-gradient(to bottom, #ef4444, rgba(239,68,68,0.3) 70%, transparent)",
          }}
        />

        <div className="relative flex items-start gap-5 p-6 sm:p-8">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded text-sm"
            style={{
              border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.08)",
              color: "#ef4444",
            }}
          >
            ▶
          </div>
          <div className="flex-1">
            <h2
              className="font-semibold"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              プロ野球予想リーグ【YouTube】
            </h2>
            <p
              className="mt-1.5 text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              毎日の順位変動＋予想家スコアをショート動画でお届け。
              <br className="hidden sm:block" />
              週末は週間まとめ長尺動画で深掘り。
            </p>
            <a
              href="https://www.youtube.com/@npb-predictions-ja"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all"
              style={{
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.08)",
                color: "#fca5a5",
              }}
            >
              チャンネルを見る →
            </a>
          </div>
        </div>
      </section>

      {/* ══════════ PAST SEASONS ══════════ */}
      {seasons.length > 1 && (
        <section>
          <div className="mb-3 flex items-center gap-4">
            <span
              className="font-display shrink-0 text-xs tracking-widest"
              style={{
                fontFamily:
                  "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.2em",
              }}
            >
              PAST SEASONS
            </span>
            <div
              className="h-px flex-1"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {seasons
              .filter((s) => !s.isActive)
              .map((s) => (
                <Link
                  key={s.id}
                  href={`/standings?year=${s.year}`}
                  className="rounded px-4 py-1.5 text-xs transition-all"
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  {s.label}
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
