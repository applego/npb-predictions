export const runtime = "edge";

import { redirect } from "next/navigation";

export default async function PredictionsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; league?: string }>;
}) {
  const { year, league } = await searchParams;
  const params = new URLSearchParams();
  if (year) params.set("year", year);
  if (league) params.set("league", league);
  const qs = params.toString();
  redirect(`/rankings/predictions${qs ? `?${qs}` : ""}`);
}
