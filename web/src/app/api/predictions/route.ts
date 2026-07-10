export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { predictions, rankingPicks, titlePicks, seasons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-server";
import { getPredictionWindowStatus, predictionWindowErrorMessage } from "@/lib/prediction-window";

const LEAGUES = ["central", "pacific"] as const;
const CATEGORIES = [
  "batting_avg",
  "rbi",
  "home_runs",
  "wins",
  "era",
  "saves",
] as const;

const PayloadSchema = z.object({
  // userId is accepted but ignored — we always use the authenticated user.
  userId: z.number().int().optional(),
  seasonId: z.number().int().positive(),
  rankings: z
    .array(
      z.object({
        league: z.enum(LEAGUES),
        rank: z.number().int().min(1).max(6),
        teamName: z.string().min(1).max(100),
      })
    )
    .length(12),
  titles: z
    .array(
      z.object({
        league: z.enum(LEAGUES),
        category: z.enum(CATEGORIES),
        playerName: z.string().min(1).max(100),
        teamName: z.string().max(100).optional(),
      })
    )
    .max(12),
});

const FRIEND_VARIANT = "default";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

function checkRateLimit(req: Request): Response | null {
  const now = Date.now();
  const key = rateLimitKey(req);
  if (!key) return null;
  for (const [bucketKey, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
  }

  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  bucket.count += 1;
  if (bucket.count <= RATE_LIMIT_MAX) return null;

  return NextResponse.json(
    { error: "Too many prediction submissions. Please retry shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)),
      },
    },
  );
}

export async function POST(req: Request) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: z.infer<typeof PayloadSchema>;
  try {
    body = PayloadSchema.parse(await req.json());
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : String(err);
    return NextResponse.json(
      { error: "Invalid payload", details: issues },
      { status: 400 }
    );
  }

  // Verify season exists and is not locked.
  const [season] = await getDb()
    .select()
    .from(seasons)
    .where(eq(seasons.id, body.seasonId))
    .limit(1);
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }
  const seasonStatus = getPredictionWindowStatus(season);
  if (!seasonStatus.allowed) {
    return NextResponse.json(
      { error: predictionWindowErrorMessage(seasonStatus.reason) },
      { status: 403 }
    );
  }

  // Per-league validation: 6 unique ranks, 6 unique teams.
  for (const league of LEAGUES) {
    const picks = body.rankings.filter((r) => r.league === league);
    if (picks.length !== 6) {
      return NextResponse.json(
        { error: `${league}: must have exactly 6 ranking picks` },
        { status: 400 }
      );
    }
    const ranks = new Set(picks.map((p) => p.rank));
    if (ranks.size !== 6) {
      return NextResponse.json(
        { error: `${league}: ranks must be unique 1..6` },
        { status: 400 }
      );
    }
    const teams = new Set(picks.map((p) => p.teamName));
    if (teams.size !== 6) {
      return NextResponse.json(
        { error: `${league}: team names must be unique` },
        { status: 400 }
      );
    }
  }

  // Per-league title duplication check (one player per category per league).
  for (const league of LEAGUES) {
    const cats = body.titles
      .filter((t) => t.league === league)
      .map((t) => t.category);
    if (new Set(cats).size !== cats.length) {
      return NextResponse.json(
        { error: `${league}: title categories must be unique` },
        { status: 400 }
      );
    }
  }

  // Reject duplicates explicitly (cleaner than DB unique-violation surface).
  const existing = await getDb()
    .select({ id: predictions.id })
    .from(predictions)
    .where(
      and(
        eq(predictions.userId, user.id),
        eq(predictions.seasonId, body.seasonId),
        eq(predictions.variant, FRIEND_VARIANT)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: "Prediction already exists for this season",
        predictionId: existing[0].id,
      },
      { status: 409 }
    );
  }

  // Insert the prediction row first so we have its id for the picks.
  const [prediction] = await getDb()
    .insert(predictions)
    .values({
      userId: user.id,
      seasonId: body.seasonId,
      variant: FRIEND_VARIANT,
    })
    .returning();

  // Insert picks in a single D1 batch. If anything fails, delete the orphan
  // prediction row to keep the DB consistent.
  try {
    const db = getDb();
    const ops: unknown[] = [];
    if (body.rankings.length > 0) {
      ops.push(
        db.insert(rankingPicks).values(
          body.rankings.map((r) => ({
            predictionId: prediction.id,
            league: r.league,
            rank: r.rank,
            teamName: r.teamName,
          }))
        )
      );
    }
    if (body.titles.length > 0) {
      ops.push(
        db.insert(titlePicks).values(
          body.titles.map((t) => ({
            predictionId: prediction.id,
            league: t.league,
            category: t.category,
            playerName: t.playerName,
            teamName: t.teamName ?? null,
          }))
        )
      );
    }
    if (ops.length > 0) {
      // drizzle-orm/d1 exposes `batch` for atomic multi-statement execution.
      const maybeBatch = (db as unknown as {
        batch?: (ops: unknown[]) => Promise<unknown>;
      }).batch;
      if (typeof maybeBatch === "function") {
        await maybeBatch(ops);
      } else {
        // Fallback for non-D1 environments (tests).
        for (const op of ops) await op;
      }
    }
  } catch (err) {
    await getDb()
      .delete(predictions)
      .where(eq(predictions.id, prediction.id));
    return NextResponse.json(
      { error: "Failed to insert picks", details: String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json(prediction, { status: 201 });
}

// PUT /api/predictions — update the caller's own prediction for the given season.
// Owner enforcement is implicit: we only ever look up predictions by (auth user, seasonId).
export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: z.infer<typeof PayloadSchema>;
  try {
    body = PayloadSchema.parse(await req.json());
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : String(err);
    return NextResponse.json(
      { error: "Invalid payload", details: issues },
      { status: 400 }
    );
  }

  const [season] = await getDb()
    .select()
    .from(seasons)
    .where(eq(seasons.id, body.seasonId))
    .limit(1);
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }
  const seasonStatus = getPredictionWindowStatus(season);
  if (!seasonStatus.allowed) {
    return NextResponse.json(
      { error: predictionWindowErrorMessage(seasonStatus.reason) },
      { status: 403 }
    );
  }

  for (const league of LEAGUES) {
    const picks = body.rankings.filter((r) => r.league === league);
    if (picks.length !== 6) {
      return NextResponse.json(
        { error: `${league}: must have exactly 6 ranking picks` },
        { status: 400 }
      );
    }
    if (new Set(picks.map((p) => p.rank)).size !== 6) {
      return NextResponse.json(
        { error: `${league}: ranks must be unique 1..6` },
        { status: 400 }
      );
    }
    if (new Set(picks.map((p) => p.teamName)).size !== 6) {
      return NextResponse.json(
        { error: `${league}: team names must be unique` },
        { status: 400 }
      );
    }
  }

  const [existing] = await getDb()
    .select()
    .from(predictions)
    .where(
      and(
        eq(predictions.userId, user.id),
        eq(predictions.seasonId, body.seasonId),
        eq(predictions.variant, FRIEND_VARIANT)
      )
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: "Prediction not found. POST to create one first." },
      { status: 404 }
    );
  }
  if (existing.isLocked) {
    return NextResponse.json(
      { error: "Prediction is locked and cannot be edited" },
      { status: 403 }
    );
  }

  const db = getDb();
  const ops: Array<Promise<unknown>> = [
    db
      .delete(rankingPicks)
      .where(eq(rankingPicks.predictionId, existing.id)) as unknown as Promise<unknown>,
    db
      .delete(titlePicks)
      .where(eq(titlePicks.predictionId, existing.id)) as unknown as Promise<unknown>,
  ];
  if (body.rankings.length > 0) {
    ops.push(
      db.insert(rankingPicks).values(
        body.rankings.map((r) => ({
          predictionId: existing.id,
          league: r.league,
          rank: r.rank,
          teamName: r.teamName,
        }))
      ) as unknown as Promise<unknown>
    );
  }
  if (body.titles.length > 0) {
    ops.push(
      db.insert(titlePicks).values(
        body.titles.map((t) => ({
          predictionId: existing.id,
          league: t.league,
          category: t.category,
          playerName: t.playerName,
          teamName: t.teamName ?? null,
        }))
      ) as unknown as Promise<unknown>
    );
  }
  ops.push(
    db
      .update(predictions)
      .set({ updatedAt: new Date() })
      .where(eq(predictions.id, existing.id)) as unknown as Promise<unknown>
  );

  const maybeBatch = (db as unknown as {
    batch?: (ops: unknown[]) => Promise<unknown>;
  }).batch;
  if (typeof maybeBatch === "function") {
    await maybeBatch(ops);
  } else {
    for (const op of ops) await op;
  }

  return NextResponse.json({ id: existing.id, updated: true });
}
