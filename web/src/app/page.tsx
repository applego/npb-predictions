export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { Season } from "@/lib/types";

export const metadata: Metadata = {
  title: "NPB Predictions League | プロ野球順位予想リーグ",
  description:
    "5人の予想家がプロ野球順位・タイトルを予想して年間王者を競うリーグ。セ・パ両リーグの順位予想とタイトル予想で盛り上がろう。",
  openGraph: {
    title: "NPB Predictions League | プロ野球順位予想リーグ",
    description:
      "5人の予想家がプロ野球順位・タイトルを予想して年間王者を競うリーグ。",
    type: "website",
  },
  alternates: { canonical: "/" },
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function getSeasons(): Promise<Season[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Season[]>;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const seasons = await getSeasons();
  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];

  return (
    <div>
      {/* Hero Section */}
      <div className="mb-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-4xl">⚾</span>
          <h1 className="text-3xl font-bold">NPB Predictions League</h1>
        </div>
        <p className="mt-2 text-blue-100">
          プロ野球順位予想リーグ — セ・パ両リーグの順位とタイトルを予想して年間王者を目指せ
        </p>
        {activeSeason && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            {activeSeason.label} シーズン開催中
          </div>
        )}
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/standings"
          className="group rounded-xl border-2 border-transparent bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">📊</div>
          <h2 className="font-bold group-hover:text-blue-600">
            Current Standings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            リアルタイムのスコアボード・順位確認
          </p>
        </Link>

        <Link
          href="/predictions"
          className="group rounded-xl border-2 border-transparent bg-white p-5 shadow-sm transition hover:border-purple-200 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">🔮</div>
          <h2 className="font-bold group-hover:text-purple-600">
            Predictions Compare
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            全員の予想を横並び比較
          </p>
        </Link>

        <Link
          href="/predictions/new"
          className="group rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">✍️</div>
          <h2 className="font-bold text-blue-700 group-hover:text-blue-800">
            予想を登録する
          </h2>
          <p className="mt-1 text-sm text-blue-600">
            今すぐ順位・タイトル予想を入力
          </p>
        </Link>
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-xl border bg-gray-50 p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">🏆 得点ルール</h2>
        <div className="grid gap-3 sm:grid-cols-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-lg">🎯</span>
            <div>
              <p className="font-medium text-gray-800">順位予想</p>
              <p>的中した順位ごとに得点</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">🏅</span>
            <div>
              <p className="font-medium text-gray-800">タイトル予想</p>
              <p>打点王・本塁打王など個人タイトルも得点対象</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">👑</span>
            <div>
              <p className="font-medium text-gray-800">年間王者決定</p>
              <p>シーズン終了時の合計スコアで決着</p>
            </div>
          </div>
        </div>
      </div>

      {/* YouTube Channel Banner */}
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-4">
          <div className="text-3xl">▶️</div>
          <div className="flex-1">
            <h2 className="font-semibold text-red-700">
              プロ野球予想リーグ【YouTube】
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              毎日の順位変動＋予想家スコアをショート動画でお届け。週末は週間まとめ長尺動画で深掘り。
            </p>
            <a
              href="https://www.youtube.com/@npb-predictions-ja"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              チャンネルを見る →
            </a>
          </div>
        </div>
      </div>

      {/* Past Seasons */}
      {seasons.length > 1 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Past Seasons</h2>
          <div className="flex flex-wrap gap-2">
            {seasons
              .filter((s) => !s.isActive)
              .map((s) => (
                <Link
                  key={s.id}
                  href={`/standings?year=${s.year}`}
                  className="rounded-full border bg-white px-4 py-1 text-sm hover:bg-gray-50"
                >
                  {s.label}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
