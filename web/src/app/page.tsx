export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsBoard } from "@/components/ResultsBoard";
import { loadSeasonResults } from "@/lib/season-results-data";
import { parseResultsQuery, type ResultsQuery } from "@/lib/results-query";

export const metadata: Metadata = {
  title: "プロ野球 順位予想の答え合わせ・解説者ランキング",
  description: "プロ野球の順位予想は誰が当てた？ セ・パ両リーグの解説者の予想を実順位と比較。暫定・確定、更新日時、予想の出典を確認し、的中数順に答え合わせできます。",
  alternates: { canonical: "/" },
  openGraph: { title: "その順位予想、どこまで当たった？｜NPB予想リーグ", description: "解説者の予想と実順位を出典つきで答え合わせ。暫定・確定と更新日時がわかる。", type: "website" },
};
export default async function HomePage({ searchParams }: { searchParams: Promise<ResultsQuery> }) {
  const query = parseResultsQuery(await searchParams);
  if (!query.valid) notFound();
  const data = await loadSeasonResults(query.year, query.scope);
  if (data.error === "unknown-year") notFound();
  return <ResultsBoard data={data} compact />;
}
