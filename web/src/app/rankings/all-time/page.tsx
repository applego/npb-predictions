export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { AllTimeTable } from "./AllTimeClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

export const metadata: Metadata = {
  title: "通算ランキング | ALL-TIME RANKINGS",
  description: "プロ野球解説者の通算順位予想的中ランキング。2014年からの全年通算スコアで比較。",
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

  return (
    <div className="space-y-6">
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
            ALL-TIME <span style={{ color: "var(--stitch)" }}>RANKINGS</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            2014年からの通算スコアランキング — {data?.totalCommentators ?? 0}人
          </p>
        </div>
        <Link
          href="/rankings/commentators"
          className="rounded-sm px-3 py-1.5 text-xs font-medium"
          style={{
            fontFamily: "var(--font-display)",
            border: "1px solid var(--border-primary)",
            color: "var(--text-secondary)",
            letterSpacing: "0.1em",
          }}
        >
          YEARLY →
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
