export const runtime = "edge";

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

  try {
    switch (type) {
      case "prediction":
        return renderPredictionCard(searchParams, dims);
      case "scoreboard":
        return renderScoreboardCard(searchParams, dims);
      case "monthly-champion":
        return renderMonthlyChampionCard(searchParams, dims);
      case "weekly":
        return renderWeeklyCard(searchParams, dims);
      default:
        return renderDefaultCard(dims);
    }
  } catch (e) {
    console.error("OG image generation error:", e);
    return renderDefaultCard(dims);
  }
}

// --- Prediction Card ---

async function renderPredictionCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number }
) {
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const userId = parseInt(searchParams.get("userId") ?? "0", 10);

  if (!userId) return renderDefaultCard(dims);

  // Fetch user + prediction data
  const user = await getDb().query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return renderDefaultCard(dims);

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  if (!season) return renderDefaultCard(dims);

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

  return new ImageResponse(
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
                fontSize: isPortrait ? 28 : 16,
                color: "#94a3b8",
                marginBottom: "4px",
              }}
            >
              NPB Predictions League {year}
            </div>
            <div
              style={{
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
                      width: isPortrait ? "44px" : "32px",
                      fontWeight: 700,
                      color: pick.rank <= 3 ? "#fbbf24" : "#94a3b8",
                    }}
                  >
                    {pick.rank}位
                  </div>
                  <div
                    style={{
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
    dims
  );
}

// --- Scoreboard Card ---

async function renderScoreboardCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number }
) {
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  if (!season) return renderDefaultCard(dims);

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

  return new ImageResponse(
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
              fontSize: isPortrait ? 28 : 16,
              color: "#94a3b8",
              marginBottom: "8px",
            }}
          >
            NPB Predictions League
          </div>
          <div
            style={{
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
                      fontSize: isPortrait ? 40 : 28,
                      fontWeight: 800,
                      color: idx === 0 ? "#fbbf24" : "white",
                    }}
                  >
                    {entry.totalScore}pt
                  </div>
                  <div
                    style={{
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
    dims
  );
}

// --- Monthly Champion Card ---

async function renderMonthlyChampionCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number }
) {
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10);

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  if (!season) return renderDefaultCard(dims);

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

  return new ImageResponse(
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
            fontSize: isPortrait ? 28 : 16,
            color: "#94a3b8",
            marginBottom: "12px",
          }}
        >
          NPB Predictions League {year}
        </div>

        <div
          style={{
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
    dims
  );
}

// --- Weekly Changes Card ---

async function renderWeeklyCard(
  searchParams: URLSearchParams,
  dims: { width: number; height: number }
) {
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  if (!season) return renderDefaultCard(dims);

  // Get all score snapshots, sorted by date descending
  const allScores = await getDb().query.scoreSnapshots.findMany({
    where: eq(scoreSnapshots.seasonId, season.id),
    orderBy: [desc(scoreSnapshots.snapshotDate)],
    with: { user: true },
  });

  if (allScores.length === 0) return renderDefaultCard(dims);

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

  return new ImageResponse(
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
              fontSize: isPortrait ? 28 : 16,
              color: "#94a3b8",
              marginBottom: "8px",
            }}
          >
            NPB Predictions League {year}
          </div>
          <div
            style={{
              fontSize: isPortrait ? 48 : 36,
              fontWeight: 800,
            }}
          >
            Weekly Score Changes
          </div>
          <div
            style={{
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
                    fontSize: isPortrait ? 40 : 28,
                    fontWeight: 800,
                    color: entry.delta > 0 ? "#4ade80" : entry.delta < 0 ? "#f87171" : "#94a3b8",
                  }}
                >
                  {entry.delta > 0 ? "+" : ""}{entry.delta}pt
                </div>
                <div
                  style={{
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
    dims
  );
}

// --- Default fallback card ---

function renderDefaultCard(dims: { width: number; height: number }) {
  const isPortrait = dims.height > dims.width;

  return new ImageResponse(
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
            fontSize: isPortrait ? 52 : 36,
            fontWeight: 800,
          }}
        >
          NPB Predictions League
        </div>
        <div
          style={{
            fontSize: isPortrait ? 28 : 18,
            color: "#94a3b8",
            marginTop: "12px",
          }}
        >
          プロ野球順位予想リーグ
        </div>
      </div>
    ),
    dims
  );
}
