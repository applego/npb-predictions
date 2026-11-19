export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PUBLIC_CACHE_HEADERS } from "@/lib/computed-cache";
import { getSeasonTitles } from "@/lib/season-titles";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  const db = getDb();
  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, yearNum));
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  // The response is the season's whole snapshot history, so it cannot be
  // shrunk; it comes from the shared computed_cache entry instead of
  // re-reading every snapshot on every request.
  const titles = await getSeasonTitles(db, season.id, yearNum);

  return NextResponse.json(titles, { headers: PUBLIC_CACHE_HEADERS });
}
