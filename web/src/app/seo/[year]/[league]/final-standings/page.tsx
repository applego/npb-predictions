export const runtime = "edge";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/StructuredData";
import { InternalLinks } from "@/components/InternalLinks";
import {
  getSeasonByYear,
  getFinalStandings,
  getLatestStandings,
  LEAGUE_LABELS,
  type League,
} from "@/lib/seo-queries";
import { getTeamsByLeague } from "@/lib/teams";
import {
  canonicalAlternates,
  clampDescription,
  socialPreview,
} from "@/lib/seo-meta";

type Props = { params: Promise<{ year: string; league: string }> };

function isLeague(v: string): v is League {
  return v === "central" || v === "pacific";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, league } = await params;
  const leagueName = LEAGUE_LABELS[league] ?? league;
  const title = `${year}年${leagueName}最終順位 — プロ野球順位予想の答え合わせ`;
  const description = clampDescription(
    `${year}年日本プロ野球（NPB）${leagueName}の最終順位表。全チームの勝敗・引分・勝率を掲載し、NPB予想リーグの順位予想と照合できます。`
  );
  const pathname = `/seo/${year}/${league}/final-standings`;
  return {
    title,
    description,
    ...socialPreview({ title, description, pathname }),
    alternates: canonicalAlternates(pathname),
  };
}

export default async function FinalStandingsPage({ params }: Props) {
  const { year: yearStr, league } = await params;
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year) || !isLeague(league)) notFound();

  const season = await getSeasonByYear(year);
  if (!season) notFound();

  const standings = season.isActive
    ? await getLatestStandings(season.id, league)
    : await getFinalStandings(season.id, league);
  const leagueName = LEAGUE_LABELS[league];

  const pageTitle = season.isActive
    ? `${year}年 ${leagueName} 現在の順位`
    : `${year}年 ${leagueName} 最終順位`;

  const breadcrumbItems = [
    { label: "過去シーズン", href: "/seo/past-seasons" },
    { label: `${year}年`, href: `/seo/${year}` },
    { label: season.isActive ? `${leagueName} 現在の順位` : `${leagueName} 最終順位` },
  ];

  const faqItems = [
    {
      question: season.isActive
        ? `${year}年${leagueName}の現在の順位は？`
        : `${year}年${leagueName}の最終順位は？`,
      answer:
        standings.length > 0
          ? (season.isActive
              ? `${year}年${leagueName}の現在首位は${standings[0].teamName}です。`
              : `${year}年${leagueName}の優勝は${standings[0].teamName}です。`) +
            standings.map((s) => `${s.rank}位: ${s.teamName}`).join("、")
          : season.isActive
            ? `${year}年${leagueName}のシーズンは開始しましたが、順位データはまだ登録されていません。`
            : `${year}年${leagueName}の最終順位はまだ確定していません。`,
    },
    {
      question: season.isActive
        ? `${year}年${leagueName}の現在首位は？`
        : `${year}年${leagueName}の優勝チームは？`,
      answer:
        standings.length > 0
          ? season.isActive
            ? `${standings[0].teamName}が${year}年${leagueName}で首位です。`
            : `${standings[0].teamName}が${year}年${leagueName}で優勝しました。`
          : "まだ確定していません。",
    },
  ];

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={faqItems} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">{pageTitle}</h1>
      <p className="mb-6 text-gray-600">
        {season.isActive
          ? `${year}年プロ野球${leagueName}の現在の順位（随時更新）`
          : `${year}年プロ野球${leagueName}の最終順位表`}
      </p>

      {standings.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          最終順位データはまだ登録されていません。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium">順位</th>
                <th className="px-4 py-3 font-medium">チーム</th>
                <th className="px-4 py-3 text-right font-medium">勝</th>
                <th className="px-4 py-3 text-right font-medium">敗</th>
                <th className="px-4 py-3 text-right font-medium">引分</th>
                <th className="px-4 py-3 text-right font-medium">勝率</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => {
                const total = row.wins + row.losses;
                const winRate = total > 0 ? (row.wins / total).toFixed(3) : "---";
                return (
                  <tr
                    key={row.id}
                    className={`border-b last:border-0 ${idx === 0 ? "bg-yellow-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-bold">{row.rank}</td>
                    <td className="px-4 py-3">{row.teamName}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.wins}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.losses}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.draws}</td>
                    <td className="px-4 py-3 text-right font-mono">{winRate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InternalLinks
        links={[
          { href: `/seo/${year}`, label: `${year}年 シーズン概要` },
          {
            href: `/seo/${year}/${league === "central" ? "pacific" : "central"}/final-standings`,
            label: `${year}年 ${league === "central" ? "パ・リーグ" : "セ・リーグ"} 最終順位`,
          },
          { href: `/seo/${year}/title-leaders`, label: `${year}年 タイトルリーダー` },
          { href: `/seo/${year}/${league}/title-leaders`, label: `${year}年 ${leagueName} タイトル` },
          { href: `/archive/${year}`, label: `${year}年 シーズンアーカイブ` },
          { href: "/seo/past-seasons", label: "過去シーズン一覧" },
        ]}
      />
      <InternalLinks
        title={`${leagueName} チーム別ページ`}
        links={getTeamsByLeague(league).map((t) => ({
          href: `/seo/${year}/teams/${t.slug}`,
          label: t.shortName,
        }))}
      />
    </div>
  );
}
