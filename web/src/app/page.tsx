export const runtime = "edge";

import Link from "next/link";
import type { Season } from "@/lib/types";

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
      <h1 className="mb-2 text-2xl font-bold">NPB Predictions League</h1>
      <p className="mb-6 text-gray-600">
        5人の予想を比較して年間王者を決めよう
      </p>

      {/* Season Selector */}
      {activeSeason && (
        <div className="mb-6 rounded-lg border bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            Active Season:{" "}
            <span className="font-bold">{activeSeason.label}</span>
          </p>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/standings"
          className="group rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="mb-2 text-2xl">📊</div>
          <h2 className="font-semibold group-hover:text-blue-600">
            Current Standings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            リアルタイムのスコアボード
          </p>
        </Link>

        <Link
          href="/predictions"
          className="group rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="mb-2 text-2xl">🔮</div>
          <h2 className="font-semibold group-hover:text-blue-600">
            Predictions Compare
          </h2>
          <p className="mt-1 text-sm text-gray-500">5人の予想を横比較</p>
        </Link>

        <Link
          href="/admin"
          className="group rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="mb-2 text-2xl">⚙️</div>
          <h2 className="font-semibold group-hover:text-orange-600">Admin</h2>
          <p className="mt-1 text-sm text-gray-500">
            シーズン管理・データ更新
          </p>
        </Link>
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
