export const runtime = "edge";

import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import {
  users,
  seasons,
  predictions,
  rankingPicks,
  scoreSnapshots,
  awards,
} from "@/db/schema";

// Image dimensions per format
const DIMENSIONS: Record<string, { width: number; height: number }> = {
  twitter: { width: 1200, height: 630 },
  instagram: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

// NPB team colors for visual flair
const TEAM_COLORS: Record<string, string> = {
  "巨人": "#F97316",
  "阪神": "#FDE047",
  "中日": "#3B82F6",
  "DeNA": "#2563EB",
  "広島": "#EF4444",
  "ヤクルト": "#059669",
  "オリックス": "#1D4ED8",
  "ソフトバンク": "#F59E0B",
  "西武": "#1E3A5F",
  "楽天": "#DC2626",
  "ロッテ": "#000000",
  "日本ハム": "#1E40AF",
};

const LEAGUE_LABELS: Record<string, string> = {
  central: "セ・リーグ",
  pacific: "パ・リーグ",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") ?? "twitter";
  const dims = DIMENSIONS[format] ?? DIMENSIONS.twitter;

  // Font is required for satori to render Japanese without crashing the
  // worker (root cause of OG 0B bug 2026-05-22). Load once, share across
  // all card renderers via parameter. If load fails, every card falls
  // back to renderDefaultCard which uses ASCII-only logo.
  const fontData = await loadFont().catch((err) => {
    console.warn("OG font load failed:", err);
    return null;
  });

  // `return await` is required so the catch actually traps async throws.
  // Without await, satori errors during render escape the try and CF Worker
  // returns 200 with an empty body.
  try {
    switch (type) {
      case "prediction":
        return await renderPredictionCard(searchParams, dims, fontData);
      case "scoreboard":
        return await renderScoreboardCard(searchParams, dims, fontData);
      case "monthly-champion":
        return await renderMonthlyChampionCard(searchParams, dims, fontData);
      case "weekly":
        return await renderWeeklyCard(searchParams, dims, fontData);
      case "season":
        return await renderSeasonCard(searchParams, dims, fontData);
      case "commentator":
        return await renderCommentatorCard(searchParams, dims, fontData);
      default:
        return await renderDefaultCard(dims);
    }
  } catch (e) {
    console.error("OG image generation error:", e);
    return await renderDefaultCard(dims, fontData);
  }
}

// ---------------------------------------------------------------------------
// Font loading + shared options builder
// ---------------------------------------------------------------------------

async function loadFont(): Promise<ArrayBuffer> {
  // Try fontsource via jsdelivr first — Google Fonts CSS→woff2 chain has
  // intermittently returned empty/error responses inside CF Pages Edge
  // runtime (root cause of OG 0B bug). jsdelivr serves binary directly,
  // single hop, no User-Agent sniffing.
  // CRITICAL: satori only accepts WOFF/TTF/OTF (NOT woff2). CF Pages tail
  // confirmed: "Error: Unsupported OpenType signature wOF2" when woff2 used.
  const sources = [
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5/files/noto-sans-jp-japanese-700-normal.woff",
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5/files/noto-sans-jp-latin-700-normal.woff",
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 1000) return buf;
      }
    } catch (e) {
      console.warn("OG font source failed:", url, e);
    }
  }
  // No Google Fonts fallback: it returns woff2 which satori rejects with
  // "Unsupported OpenType signature wOF2". jsdelivr serves woff directly.
  throw new Error("All font sources failed (woff)");
}

type OgOptions = {
  width: number;
  height: number;
  fonts?: Array<{
    name: string;
    data: ArrayBuffer;
    weight: 700;
    style: "normal";
  }>;
};

function ogOptions(
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null,
): OgOptions {
  if (!fontData) return { ...dims };
  return {
    ...dims,
    fonts: [
      {
        name: "NotoSansJP",
        data: fontData,
        weight: 700,
        style: "normal",
      },
    ],
  };
}

// Eager render: ImageResponse is a lazy stream — satori errors during PNG
// encoding bypass any try/catch around `new ImageResponse(...)` and the
// Worker returns 200 + empty body. By awaiting arrayBuffer() we surface
// the error here and can fall back to renderDefaultCard safely.
async function safeImageResponse(
  jsx: ReactElement,
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null,
  label: string,
): Promise<Response> {
  try {
    const img = new ImageResponse(jsx, ogOptions(dims, fontData));
    const buf = await img.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control":
          "public, immutable, no-transform, max-age=31536000",
      },
    });
  } catch (err) {
    console.error(`OG render error (${label}):`, err);
    return await renderDefaultCard(dims);
  }
}

// --- Prediction Card ---

async function renderPredictionCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null,
) {
  if (!fontData) return await renderDefaultCard(dims);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const userId = parseInt(searchParams.get("userId") ?? "0", 10);

  if (!userId) return await renderDefaultCard(dims);

  // Fetch user + prediction data
  const user = await getDb().query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return await renderDefaultCard(dims);

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  if (!season) return await renderDefaultCard(dims);

  const prediction = await getDb().query.predictions.findFirst({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.seasonId, season.id)
    ),
    with: {
      rankingPicks: true,
    },
  });

  const centralPicks = (prediction?.rankingPicks ?? [])
    .filter((p) => p.league === "central")
    .sort((a, b) => a.rank - b.rank);

  const pacificPicks = (prediction?.rankingPicks ?? [])
    .filter((p) => p.league === "pacific")
    .sort((a, b) => a.rank - b.rank);

  const isPortrait = dims.height > dims.width;

  return await safeImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1a1a2e",
          color: "white",
          fontFamily: "sans-serif",
          padding: isPortrait ? "80px 60px" : "40px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: isPortrait ? "60px" : "24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: isPortrait ? 28 : 16,
                color: "#94a3b8",
                marginBottom: "4px",
              }}
            >
              NPB Predictions League {year}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: isPortrait ? 56 : 36,
                fontWeight: 800,
              }}
            >
              {user.name} の順位予想
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: isPortrait ? "100px" : "64px",
              height: isPortrait ? "100px" : "64px",
              borderRadius: "50%",
              backgroundColor: "#2D5A27",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isPortrait ? 48 : 32,
              fontWeight: 700,
            }}
          >
            {user.name.charAt(0)}
          </div>
        </div>

        {/* League columns */}
        <div
          style={{
            display: "flex",
            flexDirection: isPortrait ? "column" : "row",
            gap: isPortrait ? "40px" : "40px",
            flex: 1,
          }}
        >
          {[
            { label: LEAGUE_LABELS.central, picks: centralPicks },
            { label: LEAGUE_LABELS.pacific, picks: pacificPicks },
          ].map((league) => (
            <div
              key={league.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: isPortrait ? 32 : 22,
                  fontWeight: 700,
                  color: "#86efac",
                  marginBottom: isPortrait ? "20px" : "12px",
                  borderBottom: "2px solid #2D5A27",
                  paddingBottom: "8px",
                }}
              >
                {league.label}
              </div>
              {league.picks.map((pick) => (
                <div
                  key={`${pick.league}-${pick.rank}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: isPortrait ? "14px 0" : "8px 0",
                    fontSize: isPortrait ? 30 : 22,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: isPortrait ? "44px" : "32px",
                      fontWeight: 700,
                      color: pick.rank <= 3 ? "#fbbf24" : "#94a3b8",
                    }}
                  >
                    {pick.rank}位
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: isPortrait ? "12px" : "8px",
                      height: isPortrait ? "36px" : "24px",
                      backgroundColor:
                        TEAM_COLORS[pick.teamName] ?? "#6b7280",
                      borderRadius: "4px",
                    }}
                  />
                  <div style={{ fontWeight: 600 }}>{pick.teamName}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: isPortrait ? "60px" : "16px",
            fontSize: isPortrait ? 22 : 14,
            color: "#64748b",
          }}
        >
          npb-predictions.vercel.app
        </div>
      </div>
    ),
    dims,
    fontData,
    "og-card",
  );
}

// --- Scoreboard Card ---

async function renderScoreboardCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null,
) {
  if (!fontData) return await renderDefaultCard(dims);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  if (!season) return await renderDefaultCard(dims);

  // Get latest score snapshots
  const scores = await getDb().query.scoreSnapshots.findMany({
    where: eq(scoreSnapshots.seasonId, season.id),
    orderBy: [desc(scoreSnapshots.totalScore)],
    with: {
      user: true,
    },
  });

  // Deduplicate by userId (keep highest totalScore)
  const seen = new Set<number>();
  const uniqueScores = scores.filter((s) => {
    if (seen.has(s.userId)) return false;
    seen.add(s.userId);
    return true;
  });

  const isPortrait = dims.height > dims.width;

  return await safeImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1a1a2e",
          color: "white",
          fontFamily: "sans-serif",
          padding: isPortrait ? "80px 60px" : "40px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: isPortrait ? "60px" : "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 28 : 16,
              color: "#94a3b8",
              marginBottom: "8px",
            }}
          >
            NPB Predictions League
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 56 : 40,
              fontWeight: 800,
            }}
          >
            {year} スコアボード
          </div>
        </div>

        {/* Scoreboard rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: isPortrait ? "20px" : "8px",
          }}
        >
          {uniqueScores.slice(0, 5).map((entry, idx) => {
            const rankColors = ["#fbbf24", "#c0c0c0", "#cd7f32", "#94a3b8", "#94a3b8"];
            return (
              <div
                key={entry.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: isPortrait ? "24px 28px" : "12px 20px",
                  backgroundColor: idx === 0 ? "#2D5A27" : "rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: isPortrait ? 44 : 28,
                    fontWeight: 800,
                    color: rankColors[idx] ?? "#94a3b8",
                    width: isPortrait ? "60px" : "40px",
                  }}
                >
                  {idx + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    fontSize: isPortrait ? 36 : 24,
                    fontWeight: 700,
                  }}
                >
                  {entry.user.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: isPortrait ? 40 : 28,
                      fontWeight: 800,
                      color: idx === 0 ? "#fbbf24" : "white",
                    }}
                  >
                    {entry.totalScore}pt
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: isPortrait ? 20 : 13,
                      color: "#94a3b8",
                    }}
                  >
                    順位{entry.rankingScore} + タイトル{entry.titleScore}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: isPortrait ? "60px" : "16px",
            fontSize: isPortrait ? 22 : 14,
            color: "#64748b",
          }}
        >
          npb-predictions.vercel.app
        </div>
      </div>
    ),
    dims,
    fontData,
    "og-card",
  );
}

// --- Monthly Champion Card ---

async function renderMonthlyChampionCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null,
) {
  if (!fontData) return await renderDefaultCard(dims);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10);

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  if (!season) return await renderDefaultCard(dims);

  // Find the monthly champion award
  const award = await getDb().query.awards.findFirst({
    where: and(
      eq(awards.seasonId, season.id),
      eq(awards.type, "monthly_champion"),
      eq(awards.month, month)
    ),
    with: {
      user: true,
    },
  });

  const monthLabels = [
    "", "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];

  const isPortrait = dims.height > dims.width;

  return await safeImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a2e",
          color: "white",
          fontFamily: "sans-serif",
          padding: isPortrait ? "80px 60px" : "40px 60px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: isPortrait ? 28 : 16,
            color: "#94a3b8",
            marginBottom: "12px",
          }}
        >
          NPB Predictions League {year}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: isPortrait ? 48 : 32,
            fontWeight: 800,
            color: "#fbbf24",
            marginBottom: isPortrait ? "40px" : "20px",
          }}
        >
          {monthLabels[month]} 月間チャンピオン
        </div>

        {/* Trophy icon area */}
        <div
          style={{
            display: "flex",
            width: isPortrait ? "180px" : "120px",
            height: isPortrait ? "180px" : "120px",
            borderRadius: "50%",
            backgroundColor: "#2D5A27",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isPortrait ? 80 : 56,
            marginBottom: isPortrait ? "40px" : "20px",
            border: "4px solid #fbbf24",
          }}
        >
          {award ? award.user.name.charAt(0) : "?"}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: isPortrait ? 64 : 44,
            fontWeight: 800,
            marginBottom: "8px",
          }}
        >
          {award?.user.name ?? "未定"}
        </div>

        {award && (
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 28 : 18,
              color: "#86efac",
            }}
          >
            {award.label}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: isPortrait ? "40px" : "20px",
            fontSize: isPortrait ? 22 : 14,
            color: "#64748b",
          }}
        >
          npb-predictions.vercel.app
        </div>
      </div>
    ),
    dims,
    fontData,
    "og-card",
  );
}

// --- Weekly Changes Card ---

async function renderWeeklyCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null,
) {
  if (!fontData) return await renderDefaultCard(dims);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  if (!season) return await renderDefaultCard(dims);

  // Get all score snapshots, sorted by date descending
  const allScores = await getDb().query.scoreSnapshots.findMany({
    where: eq(scoreSnapshots.seasonId, season.id),
    orderBy: [desc(scoreSnapshots.snapshotDate)],
    with: { user: true },
  });

  if (allScores.length === 0) return await renderDefaultCard(dims);

  // Find latest snapshot date and 7 days prior
  const latestDate = allScores[0].snapshotDate;
  const weekAgo = new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get latest score per user
  const latestByUser = new Map<number, typeof allScores[0]>();
  for (const s of allScores) {
    if (!latestByUser.has(s.userId)) latestByUser.set(s.userId, s);
  }

  // Get score from ~1 week ago per user
  const prevByUser = new Map<number, typeof allScores[0]>();
  for (const s of allScores) {
    if (s.snapshotDate <= weekAgo && !prevByUser.has(s.userId)) {
      prevByUser.set(s.userId, s);
    }
  }

  // Build change entries
  const changes = [...latestByUser.entries()]
    .map(([userId, latest]) => {
      const prev = prevByUser.get(userId);
      const prevTotal = prev?.totalScore ?? 0;
      const delta = latest.totalScore - prevTotal;
      return {
        userName: latest.user.name,
        currentScore: latest.totalScore,
        delta,
      };
    })
    .sort((a, b) => b.delta - a.delta); // sort by biggest gain

  const isPortrait = dims.height > dims.width;

  const weekLabel = `${(weekAgo.getMonth() + 1)}/${weekAgo.getDate()} - ${(latestDate.getMonth() + 1)}/${latestDate.getDate()}`;

  return await safeImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1a1a2e",
          color: "white",
          fontFamily: "sans-serif",
          padding: isPortrait ? "80px 60px" : "40px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: isPortrait ? "60px" : "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 28 : 16,
              color: "#94a3b8",
              marginBottom: "8px",
            }}
          >
            NPB Predictions League {year}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 48 : 36,
              fontWeight: 800,
            }}
          >
            Weekly Score Changes
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 24 : 16,
              color: "#86efac",
              marginTop: "8px",
            }}
          >
            {weekLabel}
          </div>
        </div>

        {/* Change rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: isPortrait ? "20px" : "8px",
          }}
        >
          {changes.slice(0, 5).map((entry, idx) => (
            <div
              key={entry.userName}
              style={{
                display: "flex",
                alignItems: "center",
                padding: isPortrait ? "24px 28px" : "12px 20px",
                backgroundColor: idx === 0 ? "#2D5A27" : "rgba(255,255,255,0.05)",
                borderRadius: "12px",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: isPortrait ? 44 : 28,
                  fontWeight: 800,
                  color: idx === 0 ? "#fbbf24" : "#94a3b8",
                  width: isPortrait ? "60px" : "40px",
                }}
              >
                {idx + 1}
              </div>
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  fontSize: isPortrait ? 36 : 24,
                  fontWeight: 700,
                }}
              >
                {entry.userName}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: isPortrait ? 40 : 28,
                    fontWeight: 800,
                    color: entry.delta > 0 ? "#4ade80" : entry.delta < 0 ? "#f87171" : "#94a3b8",
                  }}
                >
                  {entry.delta > 0 ? "+" : ""}{entry.delta}pt
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: isPortrait ? 20 : 13,
                    color: "#94a3b8",
                  }}
                >
                  Total: {entry.currentScore}pt
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: isPortrait ? "60px" : "16px",
            fontSize: isPortrait ? 22 : 14,
            color: "#64748b",
          }}
        >
          npb-predictions.vercel.app
        </div>
      </div>
    ),
    dims,
    fontData,
    "og-card",
  );
}

// --- Season Card (year + both-league top 3) ---

async function renderSeasonCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null,
) {
  if (!fontData) return await renderDefaultCard(dims);
  const year = parseInt(
    searchParams.get("year") ?? String(new Date().getFullYear()),
    10
  );

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  // Fetch latest standings even if season not found (best-effort)
  let centralTop3: Array<{ rank: number; teamName: string }> = [];
  let pacificTop3: Array<{ rank: number; teamName: string }> = [];

  if (season) {
    const { actualTeamStandings } = await import("@/db/schema");
    const allStandings = await getDb()
      .select()
      .from(actualTeamStandings)
      .where(eq(actualTeamStandings.seasonId, season.id))
      .orderBy(desc(actualTeamStandings.snapshotDate));

    // Dedupe by (league, teamName) taking latest snapshot
    const seenTeam = new Set<string>();
    const latestPerLeague: Record<string, typeof allStandings> = {
      central: [],
      pacific: [],
    };
    for (const row of allStandings) {
      const key = `${row.league}:${row.teamName}`;
      if (seenTeam.has(key)) continue;
      seenTeam.add(key);
      latestPerLeague[row.league]?.push(row);
    }
    centralTop3 = latestPerLeague.central
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map((r) => ({ rank: r.rank, teamName: r.teamName }));
    pacificTop3 = latestPerLeague.pacific
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map((r) => ({ rank: r.rank, teamName: r.teamName }));
  }

  const isPortrait = dims.height > dims.width;

  return await safeImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f172a",
          color: "white",
          fontFamily: "sans-serif",
          padding: isPortrait ? "80px 60px" : "40px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: isPortrait ? "50px" : "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 26 : 16,
              color: "#94a3b8",
              marginBottom: "4px",
            }}
          >
            NPB Predictions League
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 80 : 56,
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            {year} シーズン
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 24 : 16,
              color: "#86efac",
              marginTop: "4px",
            }}
          >
            プロ野球順位予想リーグ
          </div>
        </div>

        {/* League columns */}
        <div
          style={{
            display: "flex",
            flexDirection: isPortrait ? "column" : "row",
            gap: isPortrait ? "40px" : "32px",
            flex: 1,
          }}
        >
          {[
            { label: LEAGUE_LABELS.central, picks: centralTop3, accent: "#60a5fa" },
            { label: LEAGUE_LABELS.pacific, picks: pacificTop3, accent: "#f87171" },
          ].map((l) => (
            <div
              key={l.label}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: isPortrait ? 30 : 22,
                  fontWeight: 700,
                  color: l.accent,
                  marginBottom: isPortrait ? "16px" : "10px",
                  borderBottom: `2px solid ${l.accent}`,
                  paddingBottom: "6px",
                }}
              >
                {l.label}
              </div>
              {l.picks.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: isPortrait ? 22 : 16,
                    color: "#64748b",
                    padding: "12px 0",
                  }}
                >
                  順位データ未確定
                </div>
              ) : (
                l.picks.map((p) => (
                  <div
                    key={`${l.label}-${p.rank}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: isPortrait ? "12px 0" : "8px 0",
                      fontSize: isPortrait ? 28 : 22,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: isPortrait ? "44px" : "32px",
                        fontWeight: 700,
                        color: p.rank === 1 ? "#fbbf24" : "#cbd5e1",
                      }}
                    >
                      {p.rank}位
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: isPortrait ? "10px" : "8px",
                        height: isPortrait ? "30px" : "22px",
                        backgroundColor: TEAM_COLORS[p.teamName] ?? "#64748b",
                        borderRadius: "4px",
                      }}
                    />
                    <div style={{ fontWeight: 600 }}>{p.teamName}</div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: isPortrait ? "40px" : "16px",
            fontSize: isPortrait ? 20 : 13,
            color: "#64748b",
          }}
        >
          npb-predictions.pages.dev
        </div>
      </div>
    ),
    dims,
    fontData,
    "og-card",
  );
}

// --- Commentator Card (name + total + years) ---

async function renderCommentatorCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null,
) {
  if (!fontData) return await renderDefaultCard(dims);
  const name = searchParams.get("name") ?? "解説者";
  const total = parseInt(searchParams.get("total") ?? "0", 10);
  const years = parseInt(searchParams.get("years") ?? "0", 10);
  const rank = parseInt(searchParams.get("rank") ?? "0", 10);

  const isPortrait = dims.height > dims.width;
  const positive = total >= 0;
  const scoreColor = positive ? "#4ade80" : "#f87171";

  return await safeImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#111827",
          color: "white",
          fontFamily: "sans-serif",
          padding: isPortrait ? "80px 60px" : "40px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: isPortrait ? "60px" : "28px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: isPortrait ? 26 : 16,
                color: "#94a3b8",
                marginBottom: "4px",
              }}
            >
              NPB Predictions League
            </div>
            <div
              style={{
                display: "flex",
                fontSize: isPortrait ? 22 : 14,
                color: "#86efac",
              }}
            >
              解説者 予想的中率
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: isPortrait ? "110px" : "72px",
              height: isPortrait ? "110px" : "72px",
              borderRadius: "50%",
              backgroundColor: "#2D5A27",
              border: "3px solid #fbbf24",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isPortrait ? 52 : 34,
              fontWeight: 800,
            }}
          >
            {name.charAt(0)}
          </div>
        </div>

        {/* Name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: isPortrait ? 92 : 64,
              fontWeight: 800,
              letterSpacing: "0.02em",
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              marginTop: isPortrait ? "40px" : "24px",
              gap: isPortrait ? "48px" : "32px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: isPortrait ? 20 : 14,
                  color: "#94a3b8",
                  letterSpacing: "0.1em",
                }}
              >
                ALL-TIME
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: isPortrait ? 72 : 56,
                  fontWeight: 800,
                  color: scoreColor,
                  lineHeight: 1.05,
                }}
              >
                {positive ? "+" : ""}
                {total}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: isPortrait ? 20 : 14,
                  color: "#94a3b8",
                  letterSpacing: "0.1em",
                }}
              >
                SEASONS
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: isPortrait ? 72 : 56,
                  fontWeight: 800,
                  color: "#fbbf24",
                  lineHeight: 1.05,
                }}
              >
                {years}
              </div>
            </div>
            {rank > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: isPortrait ? 20 : 14,
                    color: "#94a3b8",
                    letterSpacing: "0.1em",
                  }}
                >
                  RANK
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: isPortrait ? 72 : 56,
                    fontWeight: 800,
                    color: "#e2e8f0",
                    lineHeight: 1.05,
                  }}
                >
                  {rank}位
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: isPortrait ? "40px" : "16px",
            fontSize: isPortrait ? 20 : 13,
            color: "#64748b",
          }}
        >
          npb-predictions.pages.dev
        </div>
      </div>
    ),
    dims,
    fontData,
    "og-card",
  );
}

// --- Default fallback card ---
// Eager render directly here (NOT via safeImageResponse) to avoid recursion
// when satori fails inside safeImageResponse and tries to fall back here.

const MINIMAL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

async function renderDefaultCard(
  dims: { width: number; height: number },
  fontData: ArrayBuffer | null = null,
): Promise<Response> {
  const isPortrait = dims.height > dims.width;

  try {
    const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a2e",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: isPortrait ? "120px" : "80px",
            height: isPortrait ? "120px" : "80px",
            borderRadius: "50%",
            backgroundColor: "#2D5A27",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isPortrait ? 56 : 40,
            marginBottom: "24px",
          }}
        >
          NPB
        </div>
        <div
          style={{
            display: "flex",
            fontSize: isPortrait ? 52 : 36,
            fontWeight: 800,
          }}
        >
          NPB Predictions League
        </div>
        <div
          style={{
            display: "flex",
            fontSize: isPortrait ? 28 : 18,
            color: "#94a3b8",
            marginTop: "12px",
          }}
        >
          {/* ASCII only — satori must render this even when font load fails */}
          npb-predictions.pages.dev
        </div>
      </div>
    ),
      ogOptions(dims, fontData),
    );
    const buf = await img.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, immutable, no-transform, max-age=31536000",
      },
    });
  } catch (err) {
    console.error("renderDefaultCard satori failed, returning 1x1 PNG:", err);
    return new Response(MINIMAL_PNG, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  }
}
