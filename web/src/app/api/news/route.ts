export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getOrCompute, PUBLIC_CACHE_HEADERS } from "@/lib/computed-cache";
import { generateNewsFeed } from "@/lib/news-feed";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Clamped so request input cannot mint unlimited cache keys.
  const requested = parseInt(searchParams.get("limit") ?? "30", 10);
  const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 100) : 30;

  const items = await getOrCompute(getDb(), `news:${limit}`, () => generateNewsFeed(limit));
  return NextResponse.json(items, { headers: PUBLIC_CACHE_HEADERS });
}
