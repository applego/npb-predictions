export const runtime = "edge";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/StructuredData";
import { InternalLinks } from "@/components/InternalLinks";
import {
  getSeasonByYear,
  getTitleLeaders,
  getLatestTitleLeaders,
  LEAGUE_LABELS,
  TITLE_LABELS,
  type League,
} from "@/lib/seo-queries";

type Props = { params: Promise<{ year: string; league: string }> };

function isLeague(v: string): v is League {
  return v === "central" || v === "pacific";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, league } = await params;
  const leagueName = LEAGUE_LABELS[league] ?? league;
  return {
    title: `${year}年 ${leagueName} タイトルリーダー | NPB Predictions League`,
    description: `${year}年プロ野球${leagueName}のタイトルホルダー（首位打者・本塁打王・最多勝など）一覧。`,
  };
}

export default async function LeagueTitleLeadersPage({ params }: Props) {
  const { year: yearStr, league } = await params;
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year) || !isLeague(league)) notFound();

  const season = await getSeasonByYear(year);
  if (!season) notFound();

  const titles = season.isActive
    ? await getLatestTitleLeaders(season.id, league)
    : await getTitleLeaders(season.id, league);
  const leagueName = LEAGUE_LABELS[league];

  const breadcrumbItems = [
    { label: "過去シーズン", href: "/seo/past-seasons" },
    { label: `${year}年`, href: `/seo/${year}` },
    { label: `${leagueName} タイトルリーダー` },
  ];

  const faqItems = [
    {
      question: `${year}年${leagueName}のタイトルホルダーは？`,
      answer:
        titles.length > 0
          ? titles
              .map(
                (t) =>
                  `${TITLE_LABELS[t.category] ?? t.category}: ${t.playerName}（${t.teamName ?? "-"}）`
              )
              .join("。")
          : `${year}年${leagueName}のタイトルはまだ確定していません。`,
    },
  ];

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={faqItems} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">
        {year}年 {leagueName} タイトルリーダー
      </h1>
      <p className="mb-6 text-gray-600">
        {year}年プロ野球{leagueName}のタイトルホルダー一覧
      </p>

      {titles.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          タイトルデータはまだ登録されていません。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium">タイトル</th>
                <th className="px-4 py-3 font-medium">選手</th>
                <th className="px-4 py-3 font-medium">チーム</th>
                <th className="px-4 py-3 text-right font-medium">成績</th>
              </tr>
            </thead>
            <tbody>
              {titles.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {TITLE_LABELS[row.category] ?? row.category}
                  </td>
                  <td className="px-4 py-3">{row.playerName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {row.teamName ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {row.value !== null ? row.value : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InternalLinks
        links={[
          { href: `/seo/${year}`, label: `${year}年 シーズン概要` },
          { href: `/seo/${year}/title-leaders`, label: `${year}年 全タイトルリーダー` },
          { href: `/seo/${year}/${league}/final-standings`, label: `${year}年 ${leagueName} 最終順位` },
          {
            href: `/seo/${year}/${league === "central" ? "pacific" : "central"}/title-leaders`,
            label: `${year}年 ${league === "central" ? "パ・リーグ" : "セ・リーグ"} タイトル`,
          },
          { href: `/archive/${year}`, label: `${year}年 シーズンアーカイブ` },
          { href: "/seo/past-seasons", label: "過去シーズン一覧" },
        ]}
      />
    </div>
  );
}
