export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { ScoreboardResponse } from "@/lib/types";
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
    title: `${year}年 スコアボード`,
    description: `${year}年NPB予想リーグ現在のスコアボード。各予想家の順位点・タイトル点・合計得点を確認。`,
    openGraph: {
      title: `${year}年 NPB予想リーグ スコアボード`,
      description: `${year}年プロ野球順位予想リーグ — 現在の順位表`,
      type: "website",
    },
    alternates: { canonical: `/standings?year=${year}` },
  };
}

async function getScoreboard(year: number): Promise<ScoreboardResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/seasons/${year}/current-scoreboard`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json() as Promise<ScoreboardResponse | null>;
  } catch {
    return null;
  }
}

function getRankBadge(index: number): string {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

function getScoreColor(score: number): string {
  if (score > 0) return "text-green-600";
  if (score < 0) return "text-red-600";
  return "text-gray-500";
}

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
  const data = await getScoreboard(year);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold">Current Standings</h1>
          <p className="text-sm text-gray-500">{year}シーズン スコアボード</p>
        </div>
        <ShareButton type="scoreboard" year={year} />
      </div>

      {!data || data.scores.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">
            まだスコアデータがありません。
            <br />
            Adminから順位データを登録してスコア再計算を実行してください。
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Admin へ
          </Link>
        </div>
      ) : (
        <>
          {/* Scoreboard Table */}
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium">順位</th>
                  <th className="px-4 py-3 font-medium">ユーザー</th>
                  <th className="px-4 py-3 text-right font-medium">
                    順位点
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    タイトル点
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    合計
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.scores.map((entry, idx) => (
                  <tr
                    key={entry.userId}
                    className={`border-b transition hover:bg-gray-50 ${
                      idx === 0 ? "bg-yellow-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-lg">
                      {getRankBadge(idx)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${entry.userId}?year=${year}`}
                        className="font-medium hover:text-blue-600 hover:underline"
                      >
                        {entry.userName}
                      </Link>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${getScoreColor(entry.rankingScore)}`}
                    >
                      {entry.rankingScore > 0 ? "+" : ""}
                      {entry.rankingScore}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${getScoreColor(entry.titleScore)}`}
                    >
                      {entry.titleScore > 0 ? "+" : ""}
                      {entry.titleScore}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          idx === 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {entry.totalScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Last Updated */}
          {data.scores[0]?.snapshotDate && (
            <p className="mt-3 text-right text-xs text-gray-400">
              Last updated:{" "}
              {new Date(data.scores[0].snapshotDate).toLocaleDateString(
                "ja-JP"
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
