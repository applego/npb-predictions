export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { predictions, seasons } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; userId: string }> }
) {
  const { year, userId } = await params;
  const [season] = await getDb()
    .select()
    .from(seasons)
    .where(eq(seasons.year, parseInt(year, 10)));
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const prediction = await getDb().query.predictions.findFirst({
    where: and(
      eq(predictions.seasonId, season.id),
      eq(predictions.userId, parseInt(userId, 10))
    ),
    with: {
      user: true,
      rankingPicks: true,
      titlePicks: true,
    },
  });

  if (!prediction) {
    return NextResponse.json(
      { error: "Prediction not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(prediction);
}
