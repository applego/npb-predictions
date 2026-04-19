export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import { InternalLinks } from "@/components/InternalLinks";
import { getAllSeasons } from "@/lib/seo-queries";
import { getTeamsByLeague } from "@/lib/teams";
import {
  canonicalAlternates,
  clampDescription,
  socialPreview,
} from "@/lib/seo-meta";

const PAST_TITLE = "過去シーズン一覧 — NPB予想リーグ";
const PAST_DESCRIPTION = clampDescription(
  "NPB予想リーグの過去シーズン一覧。各年のセ・リーグ／パ・リーグ最終順位、タイトルホルダー、プロ野球順位予想の的中結果をアーカイブしています。"
);

export const metadata: Metadata = {
  title: PAST_TITLE,
  description: PAST_DESCRIPTION,
  ...socialPreview({
    title: PAST_TITLE,
    description: PAST_DESCRIPTION,
    pathname: "/seo/past-seasons",
  }),
  alternates: canonicalAlternates("/seo/past-seasons"),
};

export default async function PastSeasonsPage() {
  const seasons = await getAllSeasons();

  const breadcrumbItems = [{ label: "過去シーズン" }];

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold">過去シーズン一覧</h1>
      <p className="mb-6 text-gray-600">
        NPB Predictions Leagueの全シーズンデータ
      </p>

      {seasons.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          シーズンデータがありません。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => (
            <div
              key={season.id}
              className="rounded-lg border bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold">{season.label}</h2>
                {season.isActive && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    開催中
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <Link
                  href={`/seo/${season.year}`}
                  className="text-blue-600 hover:underline"
                >
                  シーズン概要
                </Link>
                <Link
                  href={`/seo/${season.year}/central/final-standings`}
                  className="text-blue-600 hover:underline"
                >
                  セ・リーグ最終順位
                </Link>
                <Link
                  href={`/seo/${season.year}/pacific/final-standings`}
                  className="text-blue-600 hover:underline"
                >
                  パ・リーグ最終順位
                </Link>
                <Link
                  href={`/seo/${season.year}/title-leaders`}
                  className="text-blue-600 hover:underline"
                >
                  タイトルリーダー
                </Link>
                <Link
                  href={`/archive/${season.year}`}
                  className="text-blue-600 hover:underline"
                >
                  シーズンアーカイブ
                </Link>
                <Link
                  href={`/archive/${season.year}/predictions`}
                  className="text-blue-600 hover:underline"
                >
                  予想比較
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {seasons.length > 0 && (
        <>
          <InternalLinks
            title="セ・リーグ チーム一覧"
            links={getTeamsByLeague("central").map((t) => ({
              href: `/seo/${seasons[0].year}/teams/${t.slug}`,
              label: t.shortName,
            }))}
          />
          <InternalLinks
            title="パ・リーグ チーム一覧"
            links={getTeamsByLeague("pacific").map((t) => ({
              href: `/seo/${seasons[0].year}/teams/${t.slug}`,
              label: t.shortName,
            }))}
          />
        </>
      )}
    </div>
  );
}
