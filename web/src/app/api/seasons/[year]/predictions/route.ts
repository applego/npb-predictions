export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { predictions, seasons } from "@/db/schema";
import { eq, and } from "drizzle-orm";

import { publicPredictionRelations, validSeasonYear } from "@/lib/season-predictions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  if (!validSeasonYear(year)) return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  const [season] = await getDb()
    .select()
    .from(seasons)
    .where(eq(seasons.year, parseInt(year, 10)));
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const rows = await getDb().query.predictions.findMany({
    where: and(eq(predictions.seasonId, season.id), eq(predictions.isLocked, true)),
    with: publicPredictionRelations,
  });

  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}
