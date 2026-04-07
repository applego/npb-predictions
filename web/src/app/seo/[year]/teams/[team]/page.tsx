export const runtime = "edge";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/StructuredData";
import { InternalLinks } from "@/components/InternalLinks";
import {
  getSeasonByYear,
  getTeamStandings,
  getTeamTitlePlayers,
  getTeamPredictions,
  LEAGUE_LABELS,
  TITLE_LABELS,
} from "@/lib/seo-queries";
import { getTeamBySlug, getTeamsByLeague } from "@/lib/teams";

// Always use SSR — DB is not available at build time
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ year: string; team: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, team: teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);
  if (!team) return { title: "Not Found" };
  return {
    title: `${year}年 ${team.name} 成績・順位 | NPB Predictions League`,
    description: `${year}年${team.name}（${team.shortName}）のシーズン成績、順位推移、タイトルホルダー、予想リーグでの予想順位を掲載。`,
    alternates: {
      canonical: `/seo/${year}/teams/${teamSlug}`,
    },
  };
}

export default async function TeamPage({ params }: Props) {
  const { year: yearStr, team: teamSlug } = await params;
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year)) notFound();

  const team = getTeamBySlug(teamSlug);
  if (!team) notFound();

  const season = await getSeasonByYear(year);
  if (!season) notFound();

  const [standings, titlePlayers, predictions] = await Promise.all([
    getTeamStandings(season.id, team.shortName),
    getTeamTitlePlayers(season.id, team.shortName),
    getTeamPredictions(season.id, team.shortName),
  ]);

  const leagueName = LEAGUE_LABELS[team.league];
  const latestStanding = standings[0];

  const breadcrumbItems = [
    { label: "過去シーズン", href: "/seo/past-seasons" },
    { label: `${year}年`, href: `/seo/${year}` },
    { label: `${leagueName}`, href: `/seo/${year}/${team.league}/final-standings` },
    { label: team.shortName },
  ];

  const faqItems = [
    {
      question: `${year}年の${team.name}の順位は？`,
      answer: latestStanding
        ? `${year}年の${team.name}は${leagueName}${latestStanding.rank}位（${latestStanding.wins}勝${latestStanding.losses}敗${latestStanding.draws}引分）でした。`
        : `${year}年の${team.name}の最終順位はまだ確定していません。`,
    },
    {
      question: `${year}年の${team.name}のタイトルホルダーは？`,
      answer:
        titlePlayers.length > 0
          ? titlePlayers
              .map(
                (t) =>
                  `${TITLE_LABELS[t.category] ?? t.category}: ${t.playerName}`
              )
              .join("、")
          : `${year}年の${team.name}からのタイトルホルダーはいません。`,
    },
  ];

  const sameLeagueTeams = getTeamsByLeague(team.league).filter(
    (t) => t.slug !== team.slug
  );

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={faqItems} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">
        {year}年 {team.name}
      </h1>
      <p className="mb-6 text-gray-600">
        {year}年 {leagueName} {team.name}（{team.shortName}）のシーズン成績
      </p>

      {/* Season Record */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">シーズン成績</h2>
        {latestStanding ? (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {latestStanding.rank}位
                </div>
                <div className="text-sm text-gray-500">{leagueName}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{latestStanding.wins}</div>
                <div className="text-sm text-gray-500">勝</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{latestStanding.losses}</div>
                <div className="text-sm text-gray-500">敗</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{latestStanding.draws}</div>
                <div className="text-sm text-gray-500">引分</div>
              </div>
            </div>
            {latestStanding.wins + latestStanding.losses > 0 && (
              <div className="mt-3 text-center text-sm text-gray-500">
                勝率:{" "}
                {(
                  latestStanding.wins /
                  (latestStanding.wins + latestStanding.losses)
                ).toFixed(3)}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
            成績データはまだ登録されていません。
          </div>
        )}
      </section>

      {/* Title Players */}
      {titlePlayers.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">タイトルホルダー</h2>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium">タイトル</th>
                  <th className="px-4 py-3 font-medium">選手</th>
                  <th className="px-4 py-3 text-right font-medium">成績</th>
                </tr>
              </thead>
              <tbody>
                {titlePlayers.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {TITLE_LABELS[row.category] ?? row.category}
                    </td>
                    <td className="px-4 py-3">{row.playerName}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.value !== null ? row.value : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Predictions */}
      {predictions.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">メンバーの順位予想</h2>
          <p className="mb-3 text-sm text-gray-600">
            予想リーグメンバーが{team.shortName}を何位と予想したか
          </p>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium">メンバー</th>
                  <th className="px-4 py-3 font-medium">リーグ</th>
                  <th className="px-4 py-3 text-right font-medium">予想順位</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred) =>
                  pred.picks.map((pick) => (
                    <tr
                      key={`${pred.user.id}-${pick.league}-${pick.rank}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-3">{pred.user.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {LEAGUE_LABELS[pick.league]}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {pick.rank}位
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <InternalLinks
        links={[
          {
            href: `/seo/${year}/${team.league}/final-standings`,
            label: `${year}年 ${leagueName} 最終順位`,
          },
          { href: `/seo/${year}`, label: `${year}年 シーズン概要` },
          {
            href: `/seo/${year}/${team.league}/title-leaders`,
            label: `${year}年 ${leagueName} タイトル`,
          },
          ...sameLeagueTeams.map((t) => ({
            href: `/seo/${year}/teams/${t.slug}`,
            label: `${year}年 ${t.shortName}`,
          })),
          { href: "/seo/past-seasons", label: "過去シーズン一覧" },
        ]}
      />
    </div>
  );
}
