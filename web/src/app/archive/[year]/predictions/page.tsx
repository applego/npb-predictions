import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/StructuredData";
import { InternalLinks } from "@/components/InternalLinks";
import {
  getSeasonByYear,
  getSeasonPredictions,
  getFinalStandings,
  LEAGUE_LABELS,
  TITLE_LABELS,
} from "@/lib/seo-queries";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year}年 予想比較 | NPB Predictions League`,
    description: `${year}年NPB Predictions Leagueの全参加者の順位予想・タイトル予想を横比較。実際の結果と照合。`,
  };
}

export default async function PredictionsArchivePage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) notFound();

  const season = await getSeasonByYear(year);
  if (!season) notFound();

  const [predictions, centralActual, pacificActual] = await Promise.all([
    getSeasonPredictions(season.id),
    getFinalStandings(season.id, "central"),
    getFinalStandings(season.id, "pacific"),
  ]);

  const breadcrumbItems = [
    { label: "過去シーズン", href: "/seo/past-seasons" },
    { label: `${year}年`, href: `/seo/${year}` },
    { label: `アーカイブ`, href: `/archive/${year}` },
    { label: "予想比較" },
  ];

  const faqItems = [
    {
      question: `${year}年の予想リーグで最も正確だったのは？`,
      answer:
        predictions.length > 0
          ? `${year}年は${predictions.length}人が参加しました。詳細なスコアはスコアボードをご確認ください。`
          : "予想データがありません。",
    },
    {
      question: `${year}年の予想リーグの参加者は？`,
      answer:
        predictions.length > 0
          ? predictions.map((p) => p.user.name).join("、")
          : "参加者はいません。",
    },
  ];

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={faqItems} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">{year}年 予想比較</h1>
      <p className="mb-6 text-gray-600">
        全参加者の順位予想・タイトル予想を横比較
      </p>

      {predictions.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          予想データがありません。
        </div>
      ) : (
        <>
          {/* Ranking Predictions per League */}
          {(["central", "pacific"] as const).map((league) => {
            const actual =
              league === "central" ? centralActual : pacificActual;
            return (
              <section key={league} className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">
                  {LEAGUE_LABELS[league]} 順位予想
                </h2>
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="px-3 py-2 font-medium">順位</th>
                        {actual.length > 0 && (
                          <th className="px-3 py-2 font-medium text-green-700">
                            実際
                          </th>
                        )}
                        {predictions.map((p) => (
                          <th key={p.id} className="px-3 py-2 font-medium">
                            {p.user.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5, 6].map((rank) => (
                        <tr key={rank} className="border-b last:border-0">
                          <td className="px-3 py-2 font-bold">{rank}</td>
                          {actual.length > 0 && (
                            <td className="px-3 py-2 font-semibold text-green-700">
                              {actual.find((a) => a.rank === rank)?.teamName ??
                                "-"}
                            </td>
                          )}
                          {predictions.map((p) => {
                            const pick = p.rankingPicks.find(
                              (rp) =>
                                rp.league === league && rp.rank === rank
                            );
                            const isCorrect =
                              actual.length > 0 &&
                              pick?.teamName ===
                                actual.find((a) => a.rank === rank)?.teamName;
                            return (
                              <td
                                key={p.id}
                                className={`px-3 py-2 ${isCorrect ? "font-bold text-green-600" : ""}`}
                              >
                                {pick?.teamName ?? "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          {/* Title Predictions */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">タイトル予想</h2>
            {(["central", "pacific"] as const).map((league) => {
              const categories = [
                "batting_avg",
                "rbi",
                "home_runs",
                "wins",
                "era",
                "saves",
              ];
              return (
                <div key={league} className="mb-6">
                  <h3 className="mb-3 font-semibold">
                    {LEAGUE_LABELS[league]}
                  </h3>
                  <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left">
                          <th className="px-3 py-2 font-medium">タイトル</th>
                          {predictions.map((p) => (
                            <th key={p.id} className="px-3 py-2 font-medium">
                              {p.user.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat) => (
                          <tr key={cat} className="border-b last:border-0">
                            <td className="px-3 py-2 font-medium">
                              {TITLE_LABELS[cat] ?? cat}
                            </td>
                            {predictions.map((p) => {
                              const pick = p.titlePicks.find(
                                (tp) =>
                                  tp.league === league && tp.category === cat
                              );
                              return (
                                <td key={p.id} className="px-3 py-2">
                                  {pick?.playerName ?? "-"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      <InternalLinks
        links={[
          { href: `/archive/${year}`, label: `${year}年 シーズンアーカイブ` },
          { href: `/seo/${year}`, label: `${year}年 シーズン概要` },
          { href: `/seo/${year}/central/final-standings`, label: "セ・リーグ最終順位" },
          { href: `/seo/${year}/pacific/final-standings`, label: "パ・リーグ最終順位" },
          { href: `/seo/${year}/title-leaders`, label: "タイトルリーダー" },
          { href: "/seo/past-seasons", label: "過去シーズン一覧" },
        ]}
      />
    </div>
  );
}
