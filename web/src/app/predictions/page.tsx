export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { Prediction } from "@/lib/types";
import { LEAGUE_LABELS, TITLE_CATEGORY_LABELS } from "@/lib/types";
import ShareButton from "@/components/ShareButton";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const DEFAULT_YEAR = new Date().getFullYear();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}): Promise<Metadata> {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
  return {
    title: `${year}年 予想比較`,
    description: `${year}年NPB予想リーグ — 全予想家のセ・パ順位予想とタイトル予想を横比較。`,
    openGraph: {
      title: `${year}年 NPB予想リーグ 予想比較`,
      description: `${year}年プロ野球順位予想 — 5人の予想を一覧表示`,
      type: "website",
    },
    alternates: { canonical: `/predictions?year=${year}` },
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
      <div>
        <h1 className="mb-4 text-2xl font-bold">Predictions Compare</h1>
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="mb-4 text-gray-500">
            {year}シーズンの予想がまだ登録されていません。
          </p>
          <Link
            href="/predictions/new"
            className="inline-block rounded bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            + 最初の予想を登録する
          </Link>
        </div>
      </div>
    );
  }

  // Collect all users
  const users = predictions.map((p) => p.user);

  // Build ranking comparison: league -> rank -> user picks
  const leagues = ["central", "pacific"] as const;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Predictions Compare</h1>
        <div className="flex items-center gap-2">
          <ShareButton type="scoreboard" year={year} />
          <Link
            href="/predictions/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            + 予想を登録
          </Link>
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        {year}シーズン — {users.length}人の予想を横比較
      </p>

      {/* Ranking Picks Comparison */}
      {leagues.map((league) => (
        <div key={league} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">
            {LEAGUE_LABELS[league]} 順位予想
          </h2>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium">順位</th>
                  {users.map((u) => (
                    <th key={u.id} className="px-3 py-2 text-left font-medium">
                      <Link
                        href={`/users/${u.id}?year=${year}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {u.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((rank) => (
                  <tr key={rank} className="border-b">
                    <td className="px-3 py-2 font-medium">{rank}位</td>
                    {predictions.map((pred) => {
                      const pick = pred.rankingPicks.find(
                        (rp) => rp.league === league && rp.rank === rank
                      );
                      return (
                        <td key={pred.id} className="px-3 py-2">
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

      {/* Title Picks Comparison */}
      {leagues.map((league) => {
        const categories = Object.keys(TITLE_CATEGORY_LABELS) as (keyof typeof TITLE_CATEGORY_LABELS)[];
        // Only show categories where at least one user has a pick
        const relevantCategories = categories.filter((cat) =>
          predictions.some((p) =>
            p.titlePicks.some(
              (tp) => tp.league === league && tp.category === cat
            )
          )
        );
        if (relevantCategories.length === 0) return null;

        return (
          <div key={`title-${league}`} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">
              {LEAGUE_LABELS[league]} タイトル予想
            </h2>
            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium">
                      タイトル
                    </th>
                    {users.map((u) => (
                      <th
                        key={u.id}
                        className="px-3 py-2 text-left font-medium"
                      >
                        {u.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relevantCategories.map((cat) => (
                    <tr key={cat} className="border-b">
                      <td className="px-3 py-2 font-medium">
                        {TITLE_CATEGORY_LABELS[cat]}
                      </td>
                      {predictions.map((pred) => {
                        const pick = pred.titlePicks.find(
                          (tp) =>
                            tp.league === league && tp.category === cat
                        );
                        return (
                          <td key={pred.id} className="px-3 py-2">
                            {pick ? (
                              <span>
                                {pick.playerName}
                                {pick.teamName && (
                                  <span className="ml-1 text-xs text-gray-400">
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
