export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { AllTimeTable } from "./AllTimeClient";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import {
  absoluteUrl,
  canonicalAlternates,
  clampDescription,
  ogImageUrl,
  socialPreview,
  SEO_TERMS,
} from "@/lib/seo-meta";

const SITE_URL = absoluteUrl("/").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "通算ランキング",
  description: clampDescription(
    `${SEO_TERMS.npbFull}解説者・評論家の通算順位予想的中ランキング。2014年からの全年通算スコアを集計し、${SEO_TERMS.bothLeagues}の的中率を比較します。`,
  ),
  keywords: [
    SEO_TERMS.site,
    "通算ランキング",
    "解説者 的中率 通算",
    `${SEO_TERMS.npbShort} 順位予想 歴代`,
  ],
  alternates: canonicalAlternates("/rankings/all-time"),
  ...socialPreview({
    title: "通算ランキング | NPB予想リーグ",
    description:
      "プロ野球解説者の通算順位予想的中ランキング。2014年からの全年通算スコアで比較。",
    pathname: "/rankings/all-time",
    ogImage: ogImageUrl("scoreboard", {}),
  }),
};

interface YearScore {
  year: number;
  centralScore: number;
  pacificScore: number;
  totalScore: number;
  deviation: number | null;
}

interface Commentator {
  rank: number;
  userId: number;
  name: string;
  slug: string;
  source: string | null;
  yearsCount: number;
  years: YearScore[];
  allTimeCentral: number;
  allTimePacific: number;
  allTimeTotal: number;
  avgPerYear: number;
  bestScore: number;
  bestYear: number | null;
  avgDeviation: number | null;
}

interface AllTimeResponse {
  totalCommentators: number;
  availableYears: number[];
  commentators: Commentator[];
}

async function getAllTimeRankings(): Promise<AllTimeResponse | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/rankings/all-time`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<AllTimeResponse>;
  } catch {
    return null;
  }
}

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

export default async function AllTimeRankingsPage() {
  const data = await getAllTimeRankings();

  const breadcrumbItems = [
    { label: "ランキング", href: "/rankings/predictions" },
    { label: "通算ランキング" },
  ];

  return (
    <div className="space-y-6">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
              letterSpacing: "0.06em",
              color: "var(--text-primary)",
            }}
          >
            通算<span style={{ color: "var(--stitch)" }}>ランキング</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            2014年からの通算スコアランキング — {data?.totalCommentators ?? 0}人
          </p>
        </div>
        <Link
          href="/rankings/commentators"
          className="inline-flex min-h-9 items-center rounded-sm px-3 py-1.5 text-xs font-medium"
          style={{
            fontFamily: "var(--font-display)",
            border: "1px solid var(--border-primary)",
            color: "var(--text-secondary)",
            letterSpacing: "0.1em",
          }}
        >
          年度別 →
        </Link>
      </div>

      {!data || data.commentators.length === 0 ? (
        <div
          className="card rounded-lg p-10 text-center"
        >
          <p style={{ color: "var(--text-muted)" }}>ランキングデータがありません</p>
        </div>
      ) : (
        <>
          <AllTimeTable commentators={data.commentators} />
        </>
      )}
    </div>
  );
}
