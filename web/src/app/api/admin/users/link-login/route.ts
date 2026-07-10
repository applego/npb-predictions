export const runtime = "edge";

import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  awards,
  battleGroupMembers,
  battleGroups,
  likes,
  predictions,
  scoreSnapshots,
  userSettings,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-server";

const BodySchema = z
  .object({
    targetSlug: z.string().min(1),
    sourceFirebaseUid: z.string().min(1).optional(),
    sourceEmail: z.string().email().optional(),
  })
  .refine((body) => body.sourceFirebaseUid || body.sourceEmail, {
    message: "sourceFirebaseUid or sourceEmail is required",
  });

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.slug, body.targetSlug))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }

  const sourceRows = body.sourceFirebaseUid
    ? await db
        .select()
        .from(users)
        .where(eq(users.firebaseUid, body.sourceFirebaseUid))
        .limit(1)
    : body.sourceEmail
      ? await db
          .select()
          .from(users)
          .where(eq(users.email, body.sourceEmail))
          .limit(1)
      : [];
  const source = sourceRows[0] ?? null;

  const nextFirebaseUid = body.sourceFirebaseUid ?? source?.firebaseUid ?? null;
  const nextEmail = body.sourceEmail ?? source?.email ?? null;

  if (target.firebaseUid && nextFirebaseUid && target.firebaseUid !== nextFirebaseUid) {
    return NextResponse.json(
      { error: "Target user is already linked to another Firebase UID" },
      { status: 409 },
    );
  }

  if (source && source.id !== target.id && source.firebaseUid && nextFirebaseUid) {
    const sourcePredictions = await db
      .select()
      .from(predictions)
      .where(eq(predictions.userId, source.id));

    for (const prediction of sourcePredictions) {
      const conflictWhere = and(
        eq(predictions.userId, target.id),
        eq(predictions.seasonId, prediction.seasonId),
        prediction.variant === null
          ? isNull(predictions.variant)
          : eq(predictions.variant, prediction.variant),
      );
      const existing = await db.select().from(predictions).where(conflictWhere).limit(1);
      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: "Target already has a prediction for the same season and variant",
            seasonId: prediction.seasonId,
            variant: prediction.variant,
          },
          { status: 409 },
        );
      }
    }

    await db
      .update(predictions)
      .set({ userId: target.id })
      .where(eq(predictions.userId, source.id));

    await db
      .update(awards)
      .set({ userId: target.id })
      .where(eq(awards.userId, source.id));

    await db
      .update(battleGroups)
      .set({ createdBy: target.id })
      .where(eq(battleGroups.createdBy, source.id));

    const sourceMemberships = await db
      .select()
      .from(battleGroupMembers)
      .where(eq(battleGroupMembers.userId, source.id));

    for (const membership of sourceMemberships) {
      await db
        .insert(battleGroupMembers)
        .values({ groupId: membership.groupId, userId: target.id })
        .onConflictDoNothing({
          target: [battleGroupMembers.groupId, battleGroupMembers.userId],
        });
    }

    await db
      .delete(battleGroupMembers)
      .where(eq(battleGroupMembers.userId, source.id));

    const sourceSettings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, source.id));

    for (const setting of sourceSettings) {
      await db
        .insert(userSettings)
        .values({
          userId: target.id,
          key: setting.key,
          value: setting.value,
          updatedAt: setting.updatedAt,
        })
        .onConflictDoNothing({
          target: [userSettings.userId, userSettings.key],
        });
    }

    await db.delete(userSettings).where(eq(userSettings.userId, source.id));

    const sourceLikes = await db.select().from(likes).where(eq(likes.targetUserId, source.id));

    for (const like of sourceLikes) {
      await db
        .insert(likes)
        .values({
          targetUserId: target.id,
          fingerprint: like.fingerprint,
          createdAt: like.createdAt,
        })
        .onConflictDoNothing({
          target: [likes.targetUserId, likes.fingerprint],
        });
    }

    await db.delete(likes).where(eq(likes.targetUserId, source.id));

    await db
      .delete(scoreSnapshots)
      .where(eq(scoreSnapshots.userId, source.id));

    await db
      .update(users)
      .set({ firebaseUid: null, email: null })
      .where(
        and(
          eq(users.id, source.id),
          eq(users.firebaseUid, source.firebaseUid),
        ),
      );
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(nextFirebaseUid && { firebaseUid: nextFirebaseUid }),
      ...(nextEmail && { email: nextEmail }),
      ...(!target.avatarUrl && source?.avatarUrl && { avatarUrl: source.avatarUrl }),
    })
    .where(eq(users.id, target.id))
    .returning();

  return NextResponse.json({
    user: updated,
    linkedFromUserId: source && source.id !== target.id ? source.id : null,
  });
}
