export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { Prediction } from "@/lib/types";
import { LEAGUE_LABELS, TITLE_CATEGORY_LABELS } from "@/lib/types";
import ShareButton from "@/components/ShareButton";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import {
  canonicalAlternates,
  clampDescription,
  socialPreview,
} from "@/lib/seo-meta";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const DEFAULT_YEAR = new Date().getFullYear();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}): Promise<Metadata> {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
  const title = `${year}年プロ野球順位予想の比較 — NPB予想リーグ`;
  const description = clampDescription(
    `${year}年NPB予想リーグの参加者全員の順位予想とタイトル予想を横並びで比較。セ・リーグとパ・リーグの予想を一覧で確認できます。`
  );
  const pathname = `/predictions?year=${year}`;
  return {
    title,
    description,
    ...socialPreview({ title, description, pathname }),
    alternates: canonicalAlternates(pathname),
  };
}

async function getPredictions(year: number): Promise<Prediction[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons/${year}/predictions`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Prediction[]>;
  } catch {
    return [];
  }
}

const SECTION_HEADER_STYLE = {
  fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
  letterSpacing: "0.1em",
  fontSize: "1.25rem",
  color: "rgba(255,255,255,0.85)",
};

const TH_STYLE = {
  color: "rgba(255,255,255,0.3)",
  letterSpacing: "0.12em",
};

const TABLE_STYLE = {
  background: "#0a1525",
  border: "1px solid rgba(255,255,255,0.05)",
};

export default async function PredictionsComparePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
  const predictions = await getPredictions(year);

  if (predictions.length === 0) {
    return (
      <div className="space-y-6">
        <BreadcrumbJsonLd items={[{ label: `${year}年予想比較` }]} />
        <h1 style={SECTION_HEADER_STYLE}>PREDICTIONS COMPARE</h1>
        <div
          className="rounded-xl p-10 text-center"
          style={TABLE_STYLE}
        >
          <p className="mb-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {year}シーズンの予想がまだ登録されていません。
          </p>
          <Link
            href="/predictions/new"
            className="inline-block rounded px-5 py-2.5 text-sm font-medium transition-all"
            style={{
              border: "1px solid rgba(251,191,36,0.3)",
              background: "rgba(251,191,36,0.08)",
              color: "#fbbf24",
            }}
          >
            + 最初の予想を登録する
          </Link>
        </div>
      </div>
    );
  }

  const users = predictions.map((p) => p.user);
  const leagues = ["central", "pacific"] as const;

  return (
    <div className="space-y-8">
      <BreadcrumbJsonLd items={[{ label: `${year}年予想比較` }]} />
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={SECTION_HEADER_STYLE}>PREDICTIONS COMPARE</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            {year}シーズン — {users.length}人の予想を横比較
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton type="scoreboard" year={year} />
          <Link
            href="/predictions/new"
            className="rounded px-4 py-2 text-sm font-medium transition-all"
            style={{
              border: "1px solid rgba(251,191,36,0.3)",
              background: "rgba(251,191,36,0.08)",
              color: "#fbbf24",
            }}
          >
            + 予想を登録
          </Link>
        </div>
      </div>

      {/* Ranking Picks */}
      {leagues.map((league) => (
        <div key={league}>
          <SectionLabel>{LEAGUE_LABELS[league]} 順位予想</SectionLabel>
          <div className="overflow-x-auto rounded-xl" style={TABLE_STYLE}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase"
                    style={TH_STYLE}
                  >
                    順位
                  </th>
                  {users.map((u) => (
                    <th
                      key={u.id}
                      className="px-4 py-3 text-left text-xs font-medium"
                      style={TH_STYLE}
                    >
                      <Link
                        href={`/users/${u.id}?year=${year}`}
                        className="transition-colors hover:text-amber-400"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        {u.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((rank) => (
                  <tr
                    key={rank}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td
                      className="px-4 py-3 font-display text-sm"
                      style={{
                        fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                        color: "rgba(251,191,36,0.6)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {rank}位
                    </td>
                    {predictions.map((pred) => {
                      const pick = pred.rankingPicks.find(
                        (rp) => rp.league === league && rp.rank === rank
                      );
                      return (
                        <td
                          key={pred.id}
                          className="px-4 py-3"
                          style={{ color: pick ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)" }}
                        >
                          {pick?.teamName ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Title Picks */}
      {leagues.map((league) => {
        const categories = Object.keys(
          TITLE_CATEGORY_LABELS
        ) as (keyof typeof TITLE_CATEGORY_LABELS)[];
        const relevantCategories = categories.filter((cat) =>
          predictions.some((p) =>
            p.titlePicks.some(
              (tp) => tp.league === league && tp.category === cat
            )
          )
        );
        if (relevantCategories.length === 0) return null;

        return (
          <div key={`title-${league}`}>
            <SectionLabel>{LEAGUE_LABELS[league]} タイトル予想</SectionLabel>
            <div className="overflow-x-auto rounded-xl" style={TABLE_STYLE}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase"
                      style={TH_STYLE}
                    >
                      タイトル
                    </th>
                    {users.map((u) => (
                      <th
                        key={u.id}
                        className="px-4 py-3 text-left text-xs font-medium"
                        style={TH_STYLE}
                      >
                        {u.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relevantCategories.map((cat) => (
                    <tr
                      key={cat}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td
                        className="px-4 py-3 text-xs font-medium uppercase tracking-wide"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        {TITLE_CATEGORY_LABELS[cat]}
                      </td>
                      {predictions.map((pred) => {
                        const pick = pred.titlePicks.find(
                          (tp) => tp.league === league && tp.category === cat
                        );
                        return (
                          <td
                            key={pred.id}
                            className="px-4 py-3"
                            style={{ color: pick ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)" }}
                          >
                            {pick ? (
                              <span>
                                {pick.playerName}
                                {pick.teamName && (
                                  <span
                                    className="ml-1 text-xs"
                                    style={{ color: "rgba(255,255,255,0.3)" }}
                                  >
                                    ({pick.teamName})
                                  </span>
                                )}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span
        style={{
          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
          fontSize: "1.1rem",
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        {children}
      </span>
      <div
        className="h-px flex-1"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
    </div>
  );
}
