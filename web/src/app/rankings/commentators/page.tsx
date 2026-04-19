export const runtime = "edge";

import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import { CommentatorRankingsClient } from "./CommentatorRankingsClient";
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
    title: "プロ野球解説者 的中率ランキング | NPB Predictions League",
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
      <CommentatorRankingsClient />
    </>
  );
}
