import type { Metadata } from "next";
import Link from "next/link";
import {
  BroadcastBand,
  BroadcastHeading,
  BroadcastPanel,
} from "@/components/BroadcastShell";
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
    href: "/rankings/titles",
    icon: "\u{1F451}",
    kicker: "タイトル予想",
    label: "タイトル予想 的中率",
    caption: "確定タイトルと各予想者の的中状況を比較",
  },
  {
    href: "/rankings/live",
    icon: "\u{1F4C8}",
    kicker: "リーグ順位",
    label: "リーグ順位",
    caption: "順位推移と実績順位からスコア変動を追跡",
  },
  {
    href: "/rankings/predictions",
    icon: "\u{1F52E}",
    kicker: "順位予想",
    label: "順位予想マトリクス",
    caption: "セ・パ両リーグの順位予想を横断比較",
  },
  {
    href: "/predictions/new",
    icon: "\u270D",
    kicker: "予想登録",
    label: "予想を登録する",
    caption: "ドラッグ操作で順位を並べ、タイトル予想を入力",
  },
  {
    href: "/rankings/scoreboard",
    icon: "\u{1F3C6}",
    kicker: "確定結果",
    label: "確定結果",
    caption: "年度別の結果とスコアボード",
  },
  {
    href: "/rankings/all-time",
    icon: "\u{1F4CA}",
    kicker: "通算成績",
    label: "殿堂ランキング",
    caption: "通算スコアと長期成績",
  },
];

export default function RankingsIndexPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <BroadcastBand year={currentYear} />
      <BroadcastHeading kicker="放送席" title="放送席">
        <p>白基調・実況の情報密度で、タイトル予想、リーグ順位、順位予想、予想登録をすばやく確認します。</p>
      </BroadcastHeading>

      <div className="grid gap-3 sm:grid-cols-2">
        {RANKING_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group block transition-all hover:-translate-y-0.5"
          >
            <BroadcastPanel className="min-h-32 p-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-base"
                  style={{
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border-primary)",
                  }}
                  aria-hidden="true"
                >
                  {card.icon}
                </span>
                <div>
                  <p
                    className="text-[10px] font-black"
                    style={{
                      color: "var(--field)",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.16em",
                    }}
                  >
                    {card.kicker}
                  </p>
                  <h2 className="mt-1 text-base font-black" style={{ color: "var(--text-primary)" }}>
                    {card.label}
                  </h2>
                  <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                    {card.caption}
                  </p>
                </div>
              </div>
            </BroadcastPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}
