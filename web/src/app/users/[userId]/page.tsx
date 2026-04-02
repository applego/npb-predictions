export const runtime = "edge";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prediction, ScoreboardResponse } from "@/lib/types";
import { LEAGUE_LABELS, TITLE_CATEGORY_LABELS } from "@/lib/types";
import ShareButton from "@/components/ShareButton";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const DEFAULT_YEAR = new Date().getFullYear();

async function getUserPrediction(
  year: number,
  userId: string
): Promise<Prediction | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/seasons/${year}/users/${userId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json() as Promise<Prediction | null>;
  } catch {
    return null;
  }
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

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { userId } = await params;
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;

  const [prediction, scoreboard] = await Promise.all([
    getUserPrediction(year, userId),
    getScoreboard(year),
  ]);

  if (!prediction) {
    notFound();
  }

  const user = prediction.user;
  const userScore = scoreboard?.scores.find(
    (s) => s.userId === parseInt(userId, 10)
  );
  const userRank =
    scoreboard?.scores.findIndex(
      (s) => s.userId === parseInt(userId, 10)
    ) ?? -1;

  const leagues = ["central", "pacific"] as const;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-sm text-gray-500">{year}シーズン予想</p>
          </div>
        </div>
        <ShareButton
          type="prediction"
          year={year}
          userId={parseInt(userId, 10)}
          userName={user.name}
        />
      </div>

      {/* Score Summary */}
      {userScore && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <ScoreCard
            label="総合順位"
            value={`${userRank + 1}位 / ${scoreboard!.scores.length}人`}
            highlight={userRank === 0}
          />
          <ScoreCard
            label="合計スコア"
            value={String(userScore.totalScore)}
            highlight={userRank === 0}
          />
          <ScoreCard label="順位点" value={String(userScore.rankingScore)} />
          <ScoreCard label="タイトル点" value={String(userScore.titleScore)} />
        </div>
      )}

      {/* Ranking Picks */}
      {leagues.map((league) => {
        const picks = prediction.rankingPicks
          .filter((rp) => rp.league === league)
          .sort((a, b) => a.rank - b.rank);
        if (picks.length === 0) return null;

        return (
          <div key={league} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">
              {LEAGUE_LABELS[league]} 順位予想
            </h2>
            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2 text-left font-medium">順位</th>
                    <th className="px-4 py-2 text-left font-medium">チーム</th>
                  </tr>
                </thead>
                <tbody>
                  {picks.map((pick) => (
                    <tr key={pick.id} className="border-b">
                      <td className="px-4 py-2 font-medium">{pick.rank}位</td>
                      <td className="px-4 py-2">{pick.teamName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Title Picks */}
      {leagues.map((league) => {
        const picks = prediction.titlePicks.filter(
          (tp) => tp.league === league
        );
        if (picks.length === 0) return null;

        return (
          <div key={`title-${league}`} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">
              {LEAGUE_LABELS[league]} タイトル予想
            </h2>
            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2 text-left font-medium">
                      タイトル
                    </th>
                    <th className="px-4 py-2 text-left font-medium">選手</th>
                    <th className="px-4 py-2 text-left font-medium">チーム</th>
                  </tr>
                </thead>
                <tbody>
                  {picks.map((pick) => (
                    <tr key={pick.id} className="border-b">
                      <td className="px-4 py-2 font-medium">
                        {TITLE_CATEGORY_LABELS[pick.category] ?? pick.category}
                      </td>
                      <td className="px-4 py-2">{pick.playerName}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {pick.teamName ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Back Link */}
      <div className="mt-6 flex gap-3">
        <Link
          href={`/standings?year=${year}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Standings に戻る
        </Link>
        <Link
          href={`/predictions?year=${year}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Predictions Compare
        </Link>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? "border-yellow-300 bg-yellow-50" : "bg-white"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
