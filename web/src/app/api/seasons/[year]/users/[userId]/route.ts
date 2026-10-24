export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { predictions, seasons, users } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

import { publicPredictionRelations, validSeasonYear } from "@/lib/season-predictions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; userId: string }> }
) {
  const { year, userId } = await params;
  const yearNum = parseInt(year, 10);

  // Validate year
  if (!validSeasonYear(year)) {
    return NextResponse.json(
      { error: "Invalid year" },
      { status: 400 }
    );
  }

  const [season] = await getDb()
    .select()
    .from(seasons)
    .where(eq(seasons.year, yearNum));

  if (!season) {
    console.error(`[API] Season not found: year=${yearNum}`);
    return NextResponse.json(
      { error: "Season not found", year: yearNum },
      { status: 404 }
    );
  }

  // Try to parse userId as number, if it fails, treat it as slug
  const userIdNum = parseInt(userId, 10);
  let targetUserId: number;

  if (/^[1-9]\d*$/.test(userId) && Number.isSafeInteger(Number(userId))) {
    // userId is a number
    targetUserId = userIdNum;
  } else {
    // userId is a slug, look up the user
    const [user] = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.slug, userId));

    if (!user) {
      console.error(`[API] User not found by slug: slug=${userId}`);
      return NextResponse.json(
        { error: "User not found", slug: userId },
        { status: 404 }
      );
    }

    targetUserId = user.id;
  }

  const prediction = await getDb().query.predictions.findFirst({
    where: and(
      eq(predictions.seasonId, season.id),
      eq(predictions.userId, targetUserId),
      eq(predictions.isLocked, true)
    ),
    orderBy: [asc(predictions.createdAt), asc(predictions.id)],
    with: publicPredictionRelations,
  });

  if (!prediction) {
    console.error(
      `[API] Prediction not found: seasonId=${season.id}, userId=${targetUserId}`
    );
    return NextResponse.json(
      {
        error: "Prediction not found",
        seasonId: season.id,
        userId: targetUserId,
        year: yearNum
      },
      { status: 404 }
    );
  }

  return NextResponse.json(prediction, { headers: { "Cache-Control": "no-store" } });
}
