export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsBoard } from "@/components/ResultsBoard";
import { loadSeasonResults } from "@/lib/season-results-data";
import { RESULT_LABELS } from "@/lib/season-results";
import { parseResultsQuery, type ResultsQuery } from "@/lib/results-query";

type Props = { searchParams: Promise<ResultsQuery> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = parseResultsQuery(await searchParams);
  const label = `${query.year ? `${query.year}年 ` : ""}${RESULT_LABELS[query.scope]}`;
  const title = `${label} 順位予想の答え合わせ・解説者ランキング`;
  const description = `${label}の解説者・評論家の順位予想を的中数順に比較。全順位一致、各球団の予想と実順位、出典と更新日時を確認できます。`;
  return { title, description, alternates: { canonical: query.valid && query.year ? `/rankings?year=${query.year}&league=${query.scope}` : "/rankings" }, openGraph: { title, description, type: "website" }, twitter: { card: "summary_large_image", title, description } };
}
export default async function RankingsIndexPage({ searchParams }: Props) {
  const query = parseResultsQuery(await searchParams);
  if (!query.valid) notFound();
  const data = await loadSeasonResults(query.year, query.scope);
  if (data.error === "unknown-year") notFound();
  return <ResultsBoard data={data} />;
}
