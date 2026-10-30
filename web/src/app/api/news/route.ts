export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getOrCompute } from "@/lib/computed-cache";
import { generateNewsFeed } from "@/lib/news-feed";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);

  const items = await getOrCompute(getDb(), `news:${limit}`, () => generateNewsFeed(limit));
  return NextResponse.json(items);
}
