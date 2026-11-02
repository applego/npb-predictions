import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { predictions, seasons } from "@/db/schema";
import { provableRegistration } from "./prediction-registration";
import type { ResultLeague } from "./season-results";

/** A participant's prediction saved on the site before the season, with the time it was last saved. */
export interface RegisteredPrediction {
  userId: number;
  name: string;
  /** ISO time of the last save; locked rows cannot change after the season's lock time. */
  registeredAt: string;
  order: string[];
}

/**
 * Locked predictions are already public (season predictions API). Only participants are read
 * here: commentators are on the sheet from the saved results. Returns null on any failure so the
 * sheet still opens without the row.
 */
export async function loadRegisteredPrediction(year: number, userId: number, league: ResultLeague): Promise<RegisteredPrediction | null> {
  try {
    const db = getDb();
    const [season] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.year, year)).limit(1);
    if (!season) return null;
    const prediction = await db.query.predictions.findFirst({
      where: and(eq(predictions.seasonId, season.id), eq(predictions.userId, userId), eq(predictions.isLocked, true)),
      orderBy: [asc(predictions.createdAt), asc(predictions.id)],
      with: { user: { columns: { name: true, role: true } }, rankingPicks: true },
    });
    if (!prediction || prediction.user.role !== "friend") return null;
    // Hand-locked rows without a lock time, or rows changed after it, are not shown as fixed.
    const registeredAt = provableRegistration({ isLocked: prediction.isLocked, registeredAt: prediction.updatedAt, lockedAt: prediction.lockedAt });
    if (!registeredAt) return null;
    const order = prediction.rankingPicks.filter((p) => p.league === league).sort((a, b) => a.rank - b.rank).map((p) => p.teamName);
    if (order.length !== 6) return null;
    return { userId, name: prediction.user.name, registeredAt, order };
  } catch (err) {
    console.error("[sheet] registered prediction unavailable", (err as Error)?.name);
    return null;
  }
}
