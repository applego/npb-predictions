export const runtime = "edge";

import { NextResponse } from "next/server";

interface YTSearchItem {
  id: { channelId: string };
  snippet: {
    channelId: string;
    title: string;
    description: string;
    thumbnails?: { default?: { url: string } };
  };
}

interface YTSearchResponse {
  items?: YTSearchItem[];
  error?: { message: string };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q?.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "YOUTUBE_DATA_API_KEY が未設定です。管理者に Cloudflare Pages の環境変数追加を依頼してください。",
      },
      { status: 503 },
    );
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("q", `${q.trim()} プロ野球 順位予想`);
  url.searchParams.set("type", "channel");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", "4");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("relevanceLanguage", "ja");
  url.searchParams.set("regionCode", "JP");

  const res = await fetch(url.toString());
  const data = (await res.json()) as YTSearchResponse;

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "YouTube API error" },
      { status: res.status },
    );
  }

  const channels = (data.items ?? []).map((item) => ({
    channelId: item.id.channelId,
    title: item.snippet.title,
    description: item.snippet.description.slice(0, 120),
    thumbnail: item.snippet.thumbnails?.default?.url ?? null,
    url: `https://www.youtube.com/channel/${item.id.channelId}`,
  }));

  return NextResponse.json({ channels });
}
