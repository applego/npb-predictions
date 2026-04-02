export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/StructuredData";
import { InternalLinks } from "@/components/InternalLinks";
import {
  getSeasonByYear,
  getFinalStandings,
  getTitleLeaders,
  getSeasonPredictions,
  getLatestScores,
  LEAGUE_LABELS,
  TITLE_LABELS,
} from "@/lib/seo-queries";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year}年 NPBシーズンアーカイブ | NPB Predictions League`,
    description: `${year}年プロ野球シーズンの完全アーカイブ。最終順位・タイトル・予想リーグ結果を網羅。`,
  };
}

export default async function SeasonArchivePage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) notFound();

  const season = await getSeasonByYear(year);
  if (!season) notFound();

  const [centralStandings, pacificStandings, titles, predictions, scores] =
    await Promise.all([
      getFinalStandings(season.id, "central"),
      getFinalStandings(season.id, "pacific"),
      getTitleLeaders(season.id),
      getSeasonPredictions(season.id),
      getLatestScores(season.id),
    ]);

  const breadcrumbItems = [
    { label: "過去シーズン", href: "/seo/past-seasons" },
    { label: `${year}年 アーカイブ` },
  ];

  const champion = centralStandings[0]?.teamName ?? "未確定";
  const faqItems = [
    {
      question: `${year}年のNPB最終順位は？`,
      answer:
        centralStandings.length > 0
          ? `セ・リーグ: ${centralStandings.map((s) => `${s.rank}位 ${s.teamName}`).join("、")}。` +
            (pacificStandings.length > 0
              ? ` パ・リーグ: ${pacificStandings.map((s) => `${s.rank}位 ${s.teamName}`).join("、")}。`
              : "")
          : "最終順位はまだ確定していません。",
    },
    {
      question: `${year}年の予想リーグ参加者は何人？`,
      answer: `${year}年は${predictions.length}人が予想リーグに参加しました。`,
    },
    {
      question: `${year}年セ・リーグ優勝チームは？`,
      answer: `${year}年セ・リーグの優勝は${champion}です。`,
    },
  ];

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={faqItems} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">{year}年 シーズンアーカイブ</h1>
      <p className="mb-6 text-gray-600">
        {year}年プロ野球シーズンの完全アーカイブ
      </p>

      {/* Final Standings */}
      {(centralStandings.length > 0 || pacificStandings.length > 0) && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">最終順位</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {(["central", "pacific"] as const).map((league) => {
              const standings =
                league === "central" ? centralStandings : pacificStandings;
              if (standings.length === 0) return null;
              return (
                <div key={league} className="rounded-lg border bg-white p-4">
                  <h3 className="mb-3 font-semibold">
                    <Link
                      href={`/seo/${year}/${league}/final-standings`}
                      className="text-blue-600 hover:underline"
                    >
                      {LEAGUE_LABELS[league]}
                    </Link>
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {standings.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="py-1.5 font-bold">{row.rank}</td>
                          <td className="py-1.5">{row.teamName}</td>
                          <td className="py-1.5 text-right text-gray-500">
                            {row.wins}-{row.losses}-{row.draws}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Title Leaders */}
      {titles.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">
            <Link
              href={`/seo/${year}/title-leaders`}
              className="text-blue-600 hover:underline"
            >
              タイトルホルダー
            </Link>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {titles.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border bg-white px-4 py-3"
              >
                <p className="text-xs text-gray-500">
                  {LEAGUE_LABELS[t.league]} /{" "}
                  {TITLE_LABELS[t.category] ?? t.category}
                </p>
                <p className="font-semibold">{t.playerName}</p>
                <p className="text-sm text-gray-500">
                  {t.teamName ?? "-"}
                  {t.value !== null && ` / ${t.value}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prediction League Scores */}
      {scores.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">予想リーグスコア</h2>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium">ユーザー</th>
                  <th className="px-4 py-3 text-right font-medium">合計</th>
                </tr>
              </thead>
              <tbody>
                {scores.slice(0, 10).map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{s.userId}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">
                      {s.totalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm">
            <Link
              href={`/archive/${year}/predictions`}
              className="text-blue-600 hover:underline"
            >
              全予想の比較を見る →
            </Link>
          </p>
        </section>
      )}

      <InternalLinks
        links={[
          { href: `/seo/${year}`, label: `${year}年 シーズン概要` },
          { href: `/seo/${year}/central/final-standings`, label: "セ・リーグ最終順位" },
          { href: `/seo/${year}/pacific/final-standings`, label: "パ・リーグ最終順位" },
          { href: `/seo/${year}/title-leaders`, label: "タイトルリーダー" },
          { href: `/archive/${year}/predictions`, label: "予想比較" },
          { href: "/seo/past-seasons", label: "過去シーズン一覧" },
        ]}
      />
    </div>
  );
}
