export const runtime = "edge";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { affiliateClicks } from "@/db/schema";
import { findAffiliateResource } from "@/lib/affiliate-resources";

const PayloadSchema = z.object({
  resourceId: z.string().min(1).max(80),
  href: z.string().url().max(2048),
  path: z.string().max(180).optional(),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
}

function checkRateLimit(req: Request): Response | null {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }

  const key = rateLimitKey(req);
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= RATE_LIMIT_MAX) return null;
  return NextResponse.json(
    { error: "Too many clicks. Please retry shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)) },
    },
  );
}

export async function POST(req: Request) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  let body: z.infer<typeof PayloadSchema>;
  try {
    body = PayloadSchema.parse(await req.json());
  } catch (err) {
    const details = err instanceof z.ZodError ? err.issues : String(err);
    return NextResponse.json({ error: "Invalid payload", details }, { status: 400 });
  }

  const resource = findAffiliateResource(body.resourceId, body.href);
  if (!resource) {
    return NextResponse.json({ error: "Unknown affiliate resource" }, { status: 400 });
  }

  await getDb().insert(affiliateClicks).values({
    resourceId: resource.id,
    category: resource.category,
    provider: resource.provider,
    href: resource.href,
    path: body.path ?? null,
  });

  return NextResponse.json({ ok: true });
}
