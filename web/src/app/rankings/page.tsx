import type { Metadata } from "next";
import Link from "next/link";
import { canonicalAlternates, clampDescription, SEO_TERMS } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: "ランキング",
  description: clampDescription(
    `${SEO_TERMS.site}のランキング入口。順位予想一覧、ライブスコア、タイトル予想、確定結果、殿堂ランキングへすばやく移動できます。`,
  ),
  alternates: canonicalAlternates("/rankings"),
};

const RANKING_CARDS = [
  {
    href: "/rankings/predictions",
    icon: "\u{1F52E}",
    label: "順位予想一覧",
    caption: "セ・リーグとパ・リーグの予想を比較",
  },
  {
    href: "/rankings/live",
    icon: "\u{1F4C8}",
    label: "ライブスコア",
    caption: "シーズン中の変動を追跡",
  },
  {
    href: "/rankings/titles",
    icon: "\u{1F451}",
    label: "タイトル予想",
    caption: "首位打者・本塁打王・打点王を確認",
  },
  {
    href: "/rankings/scoreboard",
    icon: "\u{1F3C6}",
    label: "確定結果",
    caption: "年度別の結果とスコアボード",
  },
  {
    href: "/rankings/all-time",
    icon: "\u{1F4CA}",
    label: "殿堂ランキング",
    caption: "通算スコアと長期成績",
  },
];

export default function RankingsIndexPage() {
  return (
    <div className="space-y-6">
      <section
        className="rounded-sm p-5 sm:p-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
      >
        <p
          className="text-xs font-semibold uppercase"
          style={{
            color: "var(--stitch)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.14em",
          }}
        >
          Rankings
        </p>
        <h1
          className="mt-1"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.8rem, 5vw, 2.6rem)",
            letterSpacing: "0.04em",
          }}
        >
          ランキング
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: "var(--text-muted)" }}>
          順位予想・ライブスコア・タイトル予想・確定結果をここから開きます。
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RANKING_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group min-h-28 rounded-sm p-4 transition-all"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <span className="text-xl" aria-hidden="true">
              {card.icon}
            </span>
            <h2 className="mt-3 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {card.label}
            </h2>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              {card.caption}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
