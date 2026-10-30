export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PredictionSheet, type SheetCommentator } from "@/components/PredictionSheet";
import { loadSeasonResults } from "@/lib/season-results-data";
import { RESULT_LABELS, resultPoints } from "@/lib/season-results";
import { SHEET_DEFAULT_COMMENTATORS, commentatorRow, parseSheetQuery } from "@/lib/prediction-sheet";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function parseYear(raw: string | string[] | undefined): number | undefined | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return undefined;
  return /^\d{4}$/.test(value) ? Number(value) : null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const query = parseSheetQuery(params);
  const year = parseYear(params.year);
  const label = `${year ? `${year}年 ` : ""}${RESULT_LABELS[query.league]}`;
  const title = query.me ? `${query.me.name}さんの${label}順位予想 — 解説者と並べた一覧` : `${label} 順位予想一覧 — 解説者と自分の予想を並べる`;
  const description = `${label}の解説者の順位予想を新聞の予想一覧のように並べ、自分の予想を加えて画像で保存・共有できます。`;
  return { title, description, alternates: { canonical: `/sheet?year=${year ?? ""}&league=${query.league}` }, robots: query.me ? { index: false } : undefined,
    openGraph: { siteName: "みんなの順位予想対決", title, description, type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function PredictionSheetPage({ searchParams }: Props) {
  const params = await searchParams;
  const year = parseYear(params.year);
  if (year === null) notFound();
  const query = parseSheetQuery(params);
  const data = await loadSeasonResults(year, query.league);
  if (data.error === "unknown-year") notFound();
  const snapshot = data.summary.snapshots.find((s) => s.league === query.league);
  const hasResult = snapshot?.status === "final" || snapshot?.status === "provisional";
  // Strongest predictions first so the default selection is the most talked-about lineup.
  const ranked = [...data.summary.entries].sort((a, b) => resultPoints(b) - resultPoints(a) || a.deviation - b.deviation);
  // The same person is often registered once per outlet; identical name + picks is one row.
  const seen = new Set<string>();
  const commentators: SheetCommentator[] = [];
  for (const entry of ranked) {
    const row = commentatorRow(entry, query.league, snapshot);
    const key = `${entry.name}|${row.order.join()}`;
    if (row.order.length !== 6 || seen.has(key)) continue;
    seen.add(key);
    commentators.push({ userId: entry.userId, name: entry.name, source: entry.source, order: row.order, result: row.result });
  }
  const defaultPicks = commentators.slice(0, SHEET_DEFAULT_COMMENTATORS).map((c) => c.userId);
  return (
    <PredictionSheet
      year={data.year}
      years={data.years}
      league={query.league}
      status={hasResult ? snapshot!.status as "final" | "provisional" : "none"}
      actualOrder={hasResult ? snapshot!.rows.map((row) => row.teamName) : null}
      commentators={commentators}
      defaultPicks={defaultPicks}
      initialQuery={query}
      unavailable={data.error === "unavailable"}
    />
  );
}
