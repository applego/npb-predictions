export const runtime = "edge";

import { NextResponse } from "next/server";
import { generateNewsFeed } from "@/lib/news-feed";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);

  const items = await generateNewsFeed(limit);
  return NextResponse.json(items);
}
