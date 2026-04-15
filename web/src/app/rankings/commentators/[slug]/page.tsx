export const runtime = "edge";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import {
  getCommentatorBySlug,
  getAllCommentatorSlugs,
} from "@/lib/commentator-queries";
import { SOURCE_BADGE_CONFIG, getSourceBadgeColors } from "@/lib/commentator-types";

type SourceBadge = "YouTube" | "新聞" | "テレビ" | "ラジオ" | "雑誌" | "Web";
const SOURCE_BADGE_COLORS = SOURCE_BADGE_CONFIG;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.vercel.app";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCommentatorBySlug(decodeURIComponent(slug));
  if (!data) return { title: "Not Found" };

  const title = `${data.name} - プロ野球順位予想 的中率 | NPB Predictions League`;
  const description = `${data.name}のプロ野球順位予想的中率の推移。${data.years.map((y) => `${y.year}年: ${y.totalScore}点`).join("、")}。通算${data.allTimeTotal}点。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${SITE_URL}/rankings/commentators/${slug}`,
    },
    twitter: {
      card: "summary",
      title: `${data.name} - 順位予想的中率`,
      description,
    },
    alternates: {
      canonical: `/rankings/commentators/${slug}`,
    },
  };
}

// generateStaticParams removed: incompatible with edge runtime
// Pages are rendered on-demand at the edge instead

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function SourceBadgeChip({ source }: { source: string | null }) {
  if (!source || !(source in SOURCE_BADGE_COLORS)) {
    // Default badge for unknown/null sources
    return (
      <span
        className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
        style={{
          background: "rgba(100,100,100,0.08)",
          border: "1px solid rgba(100,100,100,0.25)",
          color: "#999",
        }}
      >
        {source ?? "不明"}
      </span>
    );
  }

  const colors = SOURCE_BADGE_COLORS[source as SourceBadge];
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
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

function ScoreTrendArrow({ years }: { years: { year: number; totalScore: number }[] }) {
  if (years.length < 2) return null;
  const sorted = [...years].sort((a, b) => a.year - b.year);
  const first = sorted[0].totalScore;
  const last = sorted[sorted.length - 1].totalScore;
  const diff = last - first;

  if (diff > 0) {
    return (
      <span className="text-sm" style={{ color: "var(--field)" }}>
        +{diff} pts
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="text-sm" style={{ color: "var(--stitch)" }}>
        {diff} pts
      </span>
    );
  }
  return (
    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
      0 pts
    </span>
  );
}

export default async function CommentatorDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCommentatorBySlug(decodeURIComponent(slug));
  if (!data) notFound();

  const sortedYears = [...data.years].sort((a, b) => a.year - b.year);

  const breadcrumbs = [
    { label: "Rankings", href: "/rankings/commentators" },
    { label: data.name },
  ];

  // JSON-LD for this person
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.name,
    url: `${SITE_URL}/rankings/commentators/${slug}`,
    description: `プロ野球解説者。通算予想的中スコア ${data.allTimeTotal}点。`,
    knowsAbout: "Nippon Professional Baseball",
  };

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Header */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1">
            <h1
              className="leading-none"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
                letterSpacing: "0.06em",
                color: "var(--text-primary)",
              }}
            >
              {data.name}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <SourceBadgeChip source={data.source} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {data.years.length}シーズン参加
              </span>
            </div>
          </div>

          {/* All-time total badge */}
          <div
            className="rounded-xl px-5 py-3 text-center"
            style={{
              background: "color-mix(in srgb, var(--dirt) 6%, transparent)",
              border: "1px solid color-mix(in srgb, var(--dirt) 20%, transparent)",
            }}
          >
            <div
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--dirt) 50%, transparent)", letterSpacing: "0.15em" }}
            >
              ALL-TIME
            </div>
            <div
              className="font-display text-2xl"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color: "var(--dirt)",
              }}
            >
              {fmtScore(data.allTimeTotal)}
            </div>
          </div>
        </div>

        {/* Score Trend Overview */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span
              className="text-xs uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color: "var(--text-muted)",
                letterSpacing: "0.14em",
              }}
            >
              SCORE TREND
            </span>
            <ScoreTrendArrow years={sortedYears} />
          </div>

          {/* Visual bar chart */}
          <div className="space-y-3">
            {sortedYears.map((yr) => {
              const maxScore = Math.max(...sortedYears.map((y) => y.totalScore), 1);
              const pct = Math.round((yr.totalScore / maxScore) * 100);
              return (
                <div key={yr.year} className="flex items-center gap-3">
                  <span
                    className="w-10 shrink-0 font-display text-sm tabular-nums"
                    style={{
                      fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {yr.year}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-6 rounded"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        background: "linear-gradient(90deg, color-mix(in srgb, var(--dirt) 15%, transparent), color-mix(in srgb, var(--dirt) 35%, transparent))",
                        border: "1px solid color-mix(in srgb, var(--dirt) 20%, transparent)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <span
                    className="w-12 shrink-0 text-right font-display text-sm tabular-nums"
                    style={{
                      fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                      color: yr.totalScore > 0 ? "var(--dirt)" : "var(--stitch)",
                    }}
                  >
                    {fmtScore(yr.totalScore)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Year-by-Year Table */}
        <div
          className="overflow-x-auto rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                {["YEAR", "CENTRAL", "PACIFIC", "TOTAL"].map((col, i) => (
                  <th
                    key={col}
                    className={`px-4 py-3 text-xs font-medium uppercase tracking-widest ${i === 0 ? "text-left" : "text-right"}`}
                    style={{
                      color: "var(--text-muted)",
                      letterSpacing: "0.14em",
                      fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedYears.map((yr, idx) => {
                const isBest =
                  yr.totalScore === Math.max(...sortedYears.map((y) => y.totalScore));
                return (
                  <tr
                    key={yr.year}
                    style={{
                      borderBottom: "1px solid var(--border-primary)",
                      background: isBest ? "color-mix(in srgb, var(--dirt) 4%, transparent)" : "transparent",
                    }}
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/seo/${yr.year}/commentator-accuracy`}
                        className="font-display text-sm transition-colors hover:text-amber-400"
                        style={{
                          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {yr.year}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className="font-display tabular-nums text-sm"
                        style={{
                          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                          color:
                            yr.centralScore > 0
                              ? "var(--dirt)"
                              : yr.centralScore < 0
                                ? "var(--stitch)"
                                : "var(--text-muted)",
                        }}
                      >
                        {fmtScore(yr.centralScore)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className="font-display tabular-nums text-sm"
                        style={{
                          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                          color:
                            yr.pacificScore > 0
                              ? "var(--dirt)"
                              : yr.pacificScore < 0
                                ? "var(--stitch)"
                                : "var(--text-muted)",
                        }}
                      >
                        {fmtScore(yr.pacificScore)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className="inline-block rounded px-3 py-1 font-display tabular-nums text-sm"
                        style={{
                          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                          background: isBest
                            ? "color-mix(in srgb, var(--dirt) 12%, transparent)"
                            : "var(--bg-elevated)",
                          color: isBest ? "var(--dirt)" : "var(--text-secondary)",
                          border: isBest
                            ? "1px solid color-mix(in srgb, var(--dirt) 25%, transparent)"
                            : "1px solid var(--border-primary)",
                        }}
                      >
                        {fmtScore(yr.totalScore)}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* All-time totals row */}
              <tr
                style={{
                  borderTop: "2px solid color-mix(in srgb, var(--dirt) 15%, transparent)",
                  background: "color-mix(in srgb, var(--dirt) 3%, transparent)",
                }}
              >
                <td
                  className="px-4 py-3.5 font-display text-sm"
                  style={{
                    fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                    color: "color-mix(in srgb, var(--dirt) 60%, transparent)",
                    letterSpacing: "0.1em",
                  }}
                >
                  TOTAL
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span
                    className="font-display tabular-nums text-sm font-bold"
                    style={{
                      fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                      color: "var(--dirt)",
                    }}
                  >
                    {fmtScore(sortedYears.reduce((sum, y) => sum + y.centralScore, 0))}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span
                    className="font-display tabular-nums text-sm font-bold"
                    style={{
                      fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                      color: "var(--dirt)",
                    }}
                  >
                    {fmtScore(sortedYears.reduce((sum, y) => sum + y.pacificScore, 0))}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span
                    className="inline-block rounded px-3 py-1 font-display tabular-nums text-sm font-bold"
                    style={{
                      fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                      background: "color-mix(in srgb, var(--dirt) 12%, transparent)",
                      color: "var(--dirt)",
                      border: "1px solid color-mix(in srgb, var(--dirt) 25%, transparent)",
                    }}
                  >
                    {fmtScore(data.allTimeTotal)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Back to rankings link */}
        <div className="flex items-center gap-3">
          <Link
            href="/rankings/commentators"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={{
              border: "1px solid var(--border-primary)",
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
            }}
          >
            &larr; ランキング一覧へ
          </Link>
        </div>
      </div>
    </>
  );
}
