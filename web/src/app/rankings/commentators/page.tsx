export const runtime = "edge";

import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import Link from "next/link";
import { CommentatorRankingsClient } from "./CommentatorRankingsClient";
import { getCommentatorRankings } from "@/lib/commentator-rankings";
import {
  absoluteUrl,
  canonicalAlternates,
  ogImageUrl,
  SEO_TERMS,
} from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: "プロ野球解説者 的中率ランキング",
  description:
    "プロ野球解説者156人の順位予想的中率ランキング。セ・パ両リーグの予想精度を年度別・リーグ別に比較。鳥谷敬、江本孟紀、槙原寛己ら歴代トップの解説者をチェック。",
  keywords: [
    SEO_TERMS.site,
    "解説者 的中率",
    "解説者 ランキング",
    `${SEO_TERMS.npbShort} 順位予想`,
    `${SEO_TERMS.bothLeagues} 予想`,
  ],
  openGraph: {
    title: "プロ野球解説者 的中率ランキング | みんなの順位予想対決",
    description:
      "プロ野球解説者156人の順位予想的中率ランキング。セ・パ両リーグの予想精度を年度別に比較。",
    type: "website",
    url: absoluteUrl("/rankings/commentators"),
    siteName: SEO_TERMS.site,
    locale: "ja_JP",
    images: [
      {
        url: ogImageUrl("scoreboard", {}),
        width: 1200,
        height: 630,
        alt: "プロ野球解説者 的中率ランキング",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "プロ野球解説者 的中率ランキング",
    description:
      "プロ野球解説者156人の順位予想的中率ランキング。年度別・リーグ別に比較。",
    images: [ogImageUrl("scoreboard", {})],
  },
  alternates: canonicalAlternates("/rankings/commentators"),
};

const PREVIEW_YEAR = 2026;
const PREVIEW_COUNT = 30;

/**
 * The interactive table loads in the browser, so its first HTML had no names and search engines saw
 * an empty page. The current season's top predictors are rendered on the server and shown until it loads.
 */
async function RankingPreview() {
  let body: Awaited<ReturnType<typeof getCommentatorRankings>> = null;
  try {
    body = await getCommentatorRankings(PREVIEW_YEAR, "all");
  } catch {
    return null;
  }
  if (!body || body.commentators.length === 0) return null;
  return (
    <section
      aria-labelledby="ranking-preview-heading"
      className="rounded-xl p-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
    >
      <h2 id="ranking-preview-heading" className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
        {PREVIEW_YEAR}年 順位予想の得点 上位{Math.min(PREVIEW_COUNT, body.commentators.length)}人（全{body.totalCommentators}人・セパ両リーグ）
      </h2>
      <ol className="mt-3 gap-x-6 text-sm sm:columns-2">
        {body.commentators.slice(0, PREVIEW_COUNT).map((c) => (
          <li key={c.userId} className="flex break-inside-avoid items-baseline gap-2 py-0.5">
            {/* Same numbering as the interactive table that replaces this list. */}
            <span className="w-7 text-right text-xs" style={{ color: "var(--text-muted)" }}>{c.rank}.</span>
            {/* Same destination as the table's names, so a name never leads to two different pages. */}
            <Link href={`/rankings/commentators/${c.slug}`} className="underline underline-offset-2" style={{ color: "var(--text-primary)" }}>
              {c.name}
            </Link>
            <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
              {c.effectiveTotal > 0 ? `+${c.effectiveTotal}` : c.effectiveTotal}点
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function CommentatorRankingsPage() {
  const breadcrumbs = [
    { label: "ランキング", href: "/rankings" },
    { label: "解説者ランキング" },
  ];

  // JSON-LD structured data for the page
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "プロ野球解説者 的中率ランキング",
    description:
      "プロ野球解説者156人の順位予想的中率ランキング。セ・パ両リーグの予想精度を年度別に比較。",
    url: absoluteUrl("/rankings/commentators"),
    isPartOf: {
      "@type": "WebSite",
      name: SEO_TERMS.site,
      url: absoluteUrl("/"),
    },
    mainEntity: {
      "@type": "ItemList",
      name: "解説者ランキング",
      numberOfItems: 156,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
    },
  };

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <CommentatorRankingsClient serverPreview={<RankingPreview />} />
    </>
  );
}
