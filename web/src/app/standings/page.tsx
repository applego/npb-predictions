export const runtime = "edge";

import { redirect } from "next/navigation";

// 旧URL → 新URL にリダイレクト
export default async function StandingsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const url = year ? `/rankings/scoreboard?year=${year}` : "/rankings/scoreboard";
  redirect(url);
}
