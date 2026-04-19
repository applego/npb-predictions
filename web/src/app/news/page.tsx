export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { NewsClient } from "./NewsClient";
import { generateNewsFeed } from "@/lib/news-feed";
import {
  canonicalAlternates,
  clampDescription,
  ogImageUrl,
  socialPreview,
  SEO_TERMS,
} from "@/lib/seo-meta";

const NEWS_TITLE = "NEWS | ニュース・アクティビティ";
const NEWS_DESCRIPTION = clampDescription(
  `${SEO_TERMS.site}の最新ニュース。的中速報、ランキング変動、新規予想、${SEO_TERMS.bothLeagues}解説者の注目情報をまとめてチェックできます。`,
);

export const metadata: Metadata = {
  title: NEWS_TITLE,
  description: NEWS_DESCRIPTION,
  keywords: [
    SEO_TERMS.site,
    "プロ野球 予想 ニュース",
    "的中速報",
    "ランキング変動",
    "解説者 予想",
  ],
  alternates: canonicalAlternates("/news"),
  ...socialPreview({
    title: NEWS_TITLE,
    description: NEWS_DESCRIPTION,
    pathname: "/news",
    ogImage: ogImageUrl("weekly", {}),
  }),
};

export default async function NewsPage() {
  const news = await generateNewsFeed(100);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-end justify-between">
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
            <span className="animate-amber-glow" style={{ color: "var(--stitch)" }}>
              NEWS
            </span>{" "}
            FEED
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            的中速報・ランキング変動・新規予想・注目情報
          </p>
        </div>

        <Link
          href="/"
          className="rounded px-3 py-1.5 text-xs font-medium tracking-wider transition-all"
          style={{
            fontFamily:
              "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            letterSpacing: "0.12em",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "var(--text-secondary)",
          }}
        >
          HOME
        </Link>
      </div>

      {/* News Feed */}
      <NewsClient items={news} />
    </div>
  );
}
