import { and, eq, gt, isNotNull, lte } from "drizzle-orm";
import type { DbClient } from "@/db";
import { predictions, seasons } from "@/db/schema";

/** Only seasons locked within this window are checked, so old seasons never cost a scan. */
const LOCK_LOOKBACK_MS = 400 * 24 * 60 * 60 * 1000;

/**
 * Fix predictions once their season's lock time has passed. The API already refuses edits
 * after lockDate (prediction-window); this records it, because public pages only show
 * locked rows. lockedAt is the season's lock time, not the time this job ran.
 * A row changed after the lock time can only come from outside the API and stays unlocked.
 */
export async function lockDuePredictions(db: DbClient, now: Date = new Date()): Promise<number> {
  const due = await db
    .select({ id: seasons.id, lockDate: seasons.lockDate })
    .from(seasons)
    .where(and(isNotNull(seasons.lockDate), lte(seasons.lockDate, now), gt(seasons.lockDate, new Date(now.getTime() - LOCK_LOOKBACK_MS))));
  let locked = 0;
  for (const season of due) {
    if (!season.lockDate) continue;
    const rows = await db
      .update(predictions)
      .set({ isLocked: true, lockedAt: season.lockDate })
      .where(and(eq(predictions.seasonId, season.id), eq(predictions.isLocked, false), lte(predictions.updatedAt, season.lockDate)))
      .returning({ id: predictions.id });
    locked += rows.length;
  }
  return locked;
}
