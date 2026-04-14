export const runtime = "edge";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import { InternalLinks } from "@/components/InternalLinks";
import {
  getTopCommentatorsForYear,
  AVAILABLE_YEARS,
  SOURCE_BADGE_COLORS,
  type SourceBadge,
} from "@/lib/commentator-queries";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.vercel.app";

type Props = { params: Promise<{ year: string }> };

// generateStaticParams removed: incompatible with edge runtime

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year) || !AVAILABLE_YEARS.includes(year as (typeof AVAILABLE_YEARS)[number])) {
    return { title: "Not Found" };
  }

  const title = `${year}年 プロ野球解説者 順位予想 的中率ランキング | NPB Predictions League`;
  const description = `${year}年プロ野球解説者の順位予想的中率ランキング。セ・パ両リーグの予想精度をスコア化してトップ20を掲載。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/seo/${year}/commentator-accuracy`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${year}年 解説者 的中率ランキング`,
      description,
    },
    alternates: {
      canonical: `/seo/${year}/commentator-accuracy`,
    },
  };
}

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function SourceBadgeChip({ source }: { source: string | null }) {
  if (!source || !(source in SOURCE_BADGE_COLORS)) {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
        不明
      </span>
    );
  }
  const colors = SOURCE_BADGE_COLORS[source as SourceBadge];
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

function getRankDisplay(index: number): string {
  if (index === 0) return "\u{1F947}";
  if (index === 1) return "\u{1F948}";
  if (index === 2) return "\u{1F949}";
  return String(index + 1);
}

export default async function CommentatorAccuracyPage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year)) notFound();

  const commentators = getTopCommentatorsForYear(year, 20);
  if (commentators.length === 0) notFound();

  const breadcrumbItems = [
    { label: "Past Seasons", href: "/seo/past-seasons" },
    { label: `${year}`, href: `/seo/${year}` },
    { label: "Commentator Accuracy" },
  ];

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${year}年 プロ野球解説者 順位予想 的中率ランキング`,
    description: `${year}年のプロ野球解説者順位予想的中率をスコア化したランキング。`,
    url: `${SITE_URL}/seo/${year}/commentator-accuracy`,
    numberOfItems: commentators.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: commentators.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: c.name,
        url: `${SITE_URL}/rankings/commentators/${c.slug}`,
        description: `${year}年予想的中スコア: ${c.totalScore}点 (セ: ${c.centralScore}, パ: ${c.pacificScore})`,
      },
    })),
  };

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">
        {year}年 プロ野球解説者 順位予想 的中率ランキング
      </h1>
      <p className="mb-6 text-gray-600">
        {year}年のプロ野球解説者{commentators.length}人の順位予想をスコア化。
        セ・パ両リーグの予想精度をランキング形式で掲載しています。
      </p>

      {/* Ranking table */}
      <div className="mb-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-2">順位</th>
              <th className="pb-2">解説者</th>
              <th className="pb-2 text-right">セ・リーグ</th>
              <th className="pb-2 text-right">パ・リーグ</th>
              <th className="pb-2 text-right">合計</th>
            </tr>
          </thead>
          <tbody>
            {commentators.map((c, idx) => (
              <tr key={c.slug} className="border-b last:border-0">
                <td className="py-2 pr-2 text-center text-base">
                  {getRankDisplay(idx)}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/rankings/commentators/${c.slug}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {c.name}
                    </Link>
                    <SourceBadgeChip source={c.source} />
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums">
                  {fmtScore(c.centralScore)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {fmtScore(c.pacificScore)}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">
                  {fmtScore(c.totalScore)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scoring explanation */}
      <section className="mb-8 rounded-lg border bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          スコアリング方式について
        </h2>
        <p className="text-sm text-gray-600">
          各解説者の開幕前順位予想と実際のシーズン結果を照合し、順位差に応じた加減点方式でスコアリングしています。
          セ・リーグとパ・リーグそれぞれ独立にスコアを算出し、合算して総合ランキングを決定しています。
        </p>
      </section>

      {/* Internal links */}
      <InternalLinks
        title="関連ページ"
        links={[
          { href: "/rankings/commentators", label: "解説者ランキング（全年度）" },
          { href: `/seo/${year}`, label: `${year}年 シーズン概要` },
          { href: `/archive/${year}`, label: `${year}年 シーズンアーカイブ` },
          { href: `/archive/${year}/predictions`, label: `${year}年 予想比較` },
          { href: "/seo/past-seasons", label: "過去シーズン一覧" },
        ]}
      />

      <InternalLinks
        title="他の年の解説者ランキング"
        links={AVAILABLE_YEARS.filter((y) => y !== year).map((y) => ({
          href: `/seo/${y}/commentator-accuracy`,
          label: `${y}年 解説者ランキング`,
        }))}
      />

      {/* Individual commentator links for crawlability */}
      <InternalLinks
        title="解説者個別ページ"
        links={commentators.map((c) => ({
          href: `/rankings/commentators/${c.slug}`,
          label: c.name,
        }))}
      />
    </div>
  );
}
