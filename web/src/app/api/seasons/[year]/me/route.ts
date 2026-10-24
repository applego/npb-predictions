export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { predictions, seasons } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-server";
import { publicPredictionRelations, validSeasonYear } from "@/lib/season-predictions";

const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };

// The caller may read their own draft; public routes only expose locked rows.
export async function GET(req: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  if (!validSeasonYear(year)) return NextResponse.json({ error: "Invalid year" }, { status: 400, headers });
  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) {
      auth.headers.set("Cache-Control", headers["Cache-Control"]);
      auth.headers.set("Vary", headers.Vary);
      return auth;
    }
    const db = getDb();
    const [season] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.year, Number(year)));
    if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404, headers });
    const prediction = await db.query.predictions.findFirst({
      where: and(eq(predictions.seasonId, season.id), eq(predictions.userId, auth.user.id)),
      orderBy: [asc(predictions.createdAt), asc(predictions.id)],
      with: publicPredictionRelations,
    });
    if (!prediction) return NextResponse.json({ error: "Prediction not found" }, { status: 404, headers });
    return NextResponse.json(prediction, { headers });
  } catch {
    return NextResponse.json({ error: "Prediction temporarily unavailable" }, { status: 503, headers });
  }
}
