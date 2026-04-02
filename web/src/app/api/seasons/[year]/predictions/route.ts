export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { predictions, seasons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  const [season] = await getDb()
    .select()
    .from(seasons)
    .where(eq(seasons.year, parseInt(year, 10)));
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const rows = await getDb().query.predictions.findMany({
    where: eq(predictions.seasonId, season.id),
    with: {
      user: true,
      rankingPicks: true,
      titlePicks: true,
    },
  });

  return NextResponse.json(rows);
}
