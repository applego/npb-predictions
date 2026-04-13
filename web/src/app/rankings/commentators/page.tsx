export const runtime = "edge";

import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import { CommentatorRankingsClient } from "./CommentatorRankingsClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.vercel.app";

export const metadata: Metadata = {
  title: "プロ野球解説者 的中率ランキング",
  description:
    "プロ野球解説者156人の順位予想的中率ランキング。セ・パ両リーグの予想精度を年度別・リーグ別に比較。鳥谷敬、江本孟紀、槙原寛己ら歴代トップの解説者をチェック。",
  openGraph: {
    title: "プロ野球解説者 的中率ランキング | NPB Predictions League",
    description:
      "プロ野球解説者156人の順位予想的中率ランキング。セ・パ両リーグの予想精度を年度別に比較。",
    type: "website",
    url: `${SITE_URL}/rankings/commentators`,
  },
  twitter: {
    card: "summary_large_image",
    title: "プロ野球解説者 的中率ランキング",
    description:
      "プロ野球解説者156人の順位予想的中率ランキング。年度別・リーグ別に比較。",
  },
  alternates: { canonical: "/rankings/commentators" },
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
    url: `${SITE_URL}/rankings/commentators`,
    isPartOf: {
      "@type": "WebSite",
      name: "NPB Predictions League",
      url: SITE_URL,
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
