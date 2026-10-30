export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { predictions, seasons } from "@/db/schema";
import { eq, and } from "drizzle-orm";

import { publicPredictionRelations, validSeasonYear } from "@/lib/season-predictions";
import { getOrCompute, PUBLIC_CACHE_HEADERS } from "@/lib/computed-cache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  if (!validSeasonYear(year)) return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  const db = getDb();
  const rows = await getOrCompute(db, `season-predictions:${year}`, async () => {
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.year, parseInt(year, 10)));
    if (!season) return null;
    return db.query.predictions.findMany({
      where: and(eq(predictions.seasonId, season.id), eq(predictions.isLocked, true)),
      with: publicPredictionRelations,
    });
  });
  if (!rows) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  return NextResponse.json(rows, { headers: PUBLIC_CACHE_HEADERS });
}
