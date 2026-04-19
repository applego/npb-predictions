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
} from "@/lib/seo-queries";
import {
  canonicalAlternates,
  clampDescription,
  ogImageUrl,
  socialPreview,
} from "@/lib/seo-meta";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const title = `${year}年プロ野球タイトルリーダー — セ・パ両リーグのタイトルホルダー`;
  const description = clampDescription(
    `${year}年日本プロ野球（NPB）のタイトル一覧。セ・リーグとパ・リーグの首位打者・本塁打王・打点王・最多勝・防御率・セーブ王を網羅しています。`
  );
  const pathname = `/seo/${year}/title-leaders`;
  const og = ogImageUrl("season", { year });
  return {
    title,
    description,
    ...socialPreview({ title, description, pathname, ogImage: og }),
    alternates: canonicalAlternates(pathname),
  };
}

export default async function TitleLeadersPage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year)) notFound();

  const season = await getSeasonByYear(year);
  if (!season) notFound();

  // For active seasons use latest snapshot; for past seasons use final data
  const titles = season.isActive
    ? await getLatestTitleLeaders(season.id)
    : await getTitleLeaders(season.id);

  const centralTitles = titles.filter((t) => t.league === "central");
  const pacificTitles = titles.filter((t) => t.league === "pacific");

  const breadcrumbItems = [
    { label: "過去シーズン", href: "/seo/past-seasons" },
    { label: `${year}年`, href: `/seo/${year}` },
    { label: "タイトルリーダー" },
  ];

  const faqItems = [
    {
      question: `${year}年NPBのタイトルホルダーは？`,
      answer:
        titles.length > 0
          ? titles
              .map(
                (t) =>
                  `${LEAGUE_LABELS[t.league]} ${TITLE_LABELS[t.category] ?? t.category}: ${t.playerName}`
              )
              .join("。")
          : `${year}年のタイトルはまだ確定していません。`,
    },
  ];

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={faqItems} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">{year}年 NPBタイトルリーダー</h1>
      <p className="mb-6 text-gray-600">
        {year}年プロ野球 各タイトルのリーダー一覧
      </p>

      {titles.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          タイトルデータはまだ登録されていません。
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {(["central", "pacific"] as const).map((league) => {
            const leagueTitles =
              league === "central" ? centralTitles : pacificTitles;
            if (leagueTitles.length === 0) return null;
            return (
              <div key={league} className="rounded-lg border bg-white p-4">
                <h2 className="mb-3 text-lg font-semibold">
                  {LEAGUE_LABELS[league]}
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2">タイトル</th>
                      <th className="pb-2">選手</th>
                      <th className="pb-2">チーム</th>
                      <th className="pb-2 text-right">成績</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagueTitles.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">
                          {TITLE_LABELS[row.category] ?? row.category}
                        </td>
                        <td className="py-2">{row.playerName}</td>
                        <td className="py-2 text-gray-500">
                          {row.teamName ?? "-"}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {row.value !== null ? row.value : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <InternalLinks
        links={[
          { href: `/seo/${year}`, label: `${year}年 シーズン概要` },
          { href: `/seo/${year}/central/final-standings`, label: `${year}年 セ・リーグ最終順位` },
          { href: `/seo/${year}/pacific/final-standings`, label: `${year}年 パ・リーグ最終順位` },
          { href: `/seo/${year}/central/title-leaders`, label: `${year}年 セ・リーグ タイトル` },
          { href: `/seo/${year}/pacific/title-leaders`, label: `${year}年 パ・リーグ タイトル` },
          { href: `/archive/${year}`, label: `${year}年 シーズンアーカイブ` },
          { href: "/seo/past-seasons", label: "過去シーズン一覧" },
        ]}
      />
    </div>
  );
}
