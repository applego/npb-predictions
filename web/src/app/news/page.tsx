export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { NewsClient } from "./NewsClient";

export const metadata: Metadata = {
  title: "NEWS | ニュース・アクティビティ",
  description:
    "NPB順位予想リーグの最新ニュース。的中速報、ランキング変動、新規予想、解説者注目情報をチェック。",
  openGraph: {
    title: "NPB Predictions League — NEWS",
    description:
      "的中速報・ランキング変動・新規予想・解説者注目情報。",
  },
  alternates: { canonical: "/news" },
};

interface NewsItem {
  id: string;
  type: "hit" | "ranking" | "prediction" | "spotlight";
  title: string;
  body: string;
  commentator?: string;
  year?: number;
  timestamp: number;
  icon: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

async function getNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${SITE_URL}/api/news?limit=50`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<NewsItem[]>;
  } catch {
    return [];
  }
}

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1
            className="leading-none"
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            <span className="animate-amber-glow" style={{ color: "#fbbf24" }}>
              NEWS
            </span>{" "}
            FEED
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            的中速報・ランキング変動・新規予想・注目情報
          </p>
        </div>

        <Link
          href="/"
          className="rounded px-3 py-1.5 text-xs font-medium tracking-wider transition-all"
          style={{
            fontFamily:
              "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            letterSpacing: "0.12em",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          HOME
        </Link>
      </div>

      {/* News Feed */}
      <NewsClient items={news} />
    </div>
  );
}
