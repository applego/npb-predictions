import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import { InternalLinks } from "@/components/InternalLinks";
import {
  getSeasonByYear,
  getFinalStandings,
  getTitleLeaders,
  LEAGUE_LABELS,
} from "@/lib/seo-queries";
import { getTeamsByLeague } from "@/lib/teams";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year}年 NPBシーズン概要 | NPB Predictions League`,
    description: `${year}年プロ野球シーズンの順位結果・タイトルホルダー・予想リーグの成績をまとめたページです。`,
  };
}

export default async function SeasonOverviewPage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) notFound();

  const season = await getSeasonByYear(year);
  if (!season) notFound();

  const [centralStandings, pacificStandings, titles] = await Promise.all([
    getFinalStandings(season.id, "central"),
    getFinalStandings(season.id, "pacific"),
    getTitleLeaders(season.id),
  ]);

  const breadcrumbItems = [
    { label: "過去シーズン", href: "/seo/past-seasons" },
    { label: `${year}年` },
  ];

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">{year}年 NPBシーズン概要</h1>
      <p className="mb-6 text-gray-600">
        {year}年プロ野球シーズンの順位結果とタイトルホルダー
      </p>

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
                  <h3 className="mb-3 font-semibold">{LEAGUE_LABELS[league]}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2">順位</th>
                        <th className="pb-2">チーム</th>
                        <th className="pb-2 text-right">勝</th>
                        <th className="pb-2 text-right">敗</th>
                        <th className="pb-2 text-right">引</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="py-2">{row.rank}</td>
                          <td className="py-2">{row.teamName}</td>
                          <td className="py-2 text-right">{row.wins}</td>
                          <td className="py-2 text-right">{row.losses}</td>
                          <td className="py-2 text-right">{row.draws}</td>
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

      {titles.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">タイトルホルダー</h2>
          <p className="text-sm text-gray-500">
            各タイトルの詳細は{" "}
            <a
              href={`/seo/${year}/title-leaders`}
              className="text-blue-600 hover:underline"
            >
              タイトルリーダーページ
            </a>
            をご覧ください。
          </p>
        </section>
      )}

      <InternalLinks
        links={[
          { href: `/seo/${year}/central/final-standings`, label: `${year}年 セ・リーグ最終順位` },
          { href: `/seo/${year}/pacific/final-standings`, label: `${year}年 パ・リーグ最終順位` },
          { href: `/seo/${year}/title-leaders`, label: `${year}年 タイトルリーダー` },
          { href: `/seo/${year}/central/title-leaders`, label: `${year}年 セ・リーグ タイトル` },
          { href: `/seo/${year}/pacific/title-leaders`, label: `${year}年 パ・リーグ タイトル` },
          { href: `/archive/${year}`, label: `${year}年 シーズンアーカイブ` },
          { href: `/archive/${year}/predictions`, label: `${year}年 予想比較` },
          { href: "/seo/past-seasons", label: "過去シーズン一覧" },
        ]}
      />

      <InternalLinks
        title="チーム別ページ（セ・リーグ）"
        links={getTeamsByLeague("central").map((t) => ({
          href: `/seo/${year}/teams/${t.slug}`,
          label: `${t.shortName}`,
        }))}
      />
      <InternalLinks
        title="チーム別ページ（パ・リーグ）"
        links={getTeamsByLeague("pacific").map((t) => ({
          href: `/seo/${year}/teams/${t.slug}`,
          label: `${t.shortName}`,
        }))}
      />
    </div>
  );
}
