export const runtime = "edge";

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { eq, and } from "drizzle-orm";
import {
  users,
  seasons,
  predictions,
  rankingPicks,
} from "@/db/schema";
import { getTeamByName, type NpbTeam } from "@/lib/teams";
import {
  selectTemplate,
  renderTemplate,
  computeBoldness,
  getBoldnessLabel,
  getTimingLabel,
  getConsensusLabel,
  type ArticleTemplateVars,
} from "@/lib/article-templates";

// OGP standard dimensions
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Fetch Noto Sans JP Bold at build/runtime. jsdelivr first (single hop,
// reliable inside CF Pages Edge runtime); Google Fonts CSS chain as last
// resort. Google Fonts intermittently returns empty/error responses to
// CF Worker fetches (root cause of OG 0B bug 2026-05-22).
async function loadFont(): Promise<ArrayBuffer> {
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
  // No Google Fonts fallback: returns woff2 which satori rejects.
  throw new Error("All font sources failed (woff)");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(
    searchParams.get("year") ?? String(new Date().getFullYear()),
    10,
  );
  const userId = parseInt(searchParams.get("userId") ?? "0", 10);

  if (!userId) return renderFallback();

  try {
    const [fontData, userData] = await Promise.all([
      loadFont().catch((err) => {
        console.warn("OG font load failed, will fallback:", err);
        return null;
      }),
      fetchPredictionData(userId, year),
    ]);

    if (!userData) return renderFallback();
    // Font is required for Japanese-heavy newspaper layout. If Google Fonts
    // fetch failed (CF Pages Edge sometimes blocks/timeouts), satori would
    // crash mid-render and CF Worker returns 200 with empty body — render
    // the simpler fallback (ASCII-dominant) instead.
    if (!fontData) return renderFallback();

    const { user, centralPicks, pacificPicks, allCentral1s, allPacific1s } =
      userData;

    const central1 = centralPicks[0]?.teamName ?? "???";
    const pacific1 = pacificPicks[0]?.teamName ?? "???";

    // Compute article variables
    const boldnessLevel = computeBoldness(
      central1,
      pacific1,
      allCentral1s,
      allPacific1s,
    );
    const month = new Date().getMonth() + 1;

    const vars: ArticleTemplateVars = {
      name: user.name,
      year,
      central1,
      pacific1,
      boldness: getBoldnessLabel(boldnessLevel),
      timing: getTimingLabel(month),
      consensus: getConsensusLabel(
        allCentral1s.filter((t) => t === central1).length /
          Math.max(allCentral1s.length, 1),
      ),
    };

    const template = selectTemplate(userId, year);
    const article = renderTemplate(template, vars);

    // Eager render: satori errors during PNG encoding happen mid-stream
    // and bypass try/catch around `new ImageResponse(...)`. By awaiting
    // arrayBuffer() we surface the error here and can fall back safely.
    try {
      const img = new ImageResponse(
        newspaperLayout(user.name, year, article, centralPicks, pacificPicks),
        {
          width: OG_WIDTH,
          height: OG_HEIGHT,
          fonts: [
            {
              name: "NotoSansJP",
              data: fontData,
              weight: 700,
              style: "normal",
            },
          ],
        },
      );
      const buf = await img.arrayBuffer();
      return new Response(buf, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "cache-control":
            "public, immutable, no-transform, max-age=31536000",
        },
      });
    } catch (renderErr) {
      console.error("OG prediction satori render error:", renderErr);
      return renderFallback();
    }
  } catch (e) {
    console.error("OG prediction image error:", e);
    return renderFallback();
  }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface PredictionData {
  user: { name: string };
  centralPicks: { rank: number; teamName: string }[];
  pacificPicks: { rank: number; teamName: string }[];
  allCentral1s: string[];
  allPacific1s: string[];
}

async function fetchPredictionData(
  userId: number,
  year: number,
): Promise<PredictionData | null> {
  const db = getDb();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return null;

  const season = await db.query.seasons.findFirst({
    where: eq(seasons.year, year),
  });
  if (!season) return null;

  const prediction = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.seasonId, season.id),
    ),
    with: { rankingPicks: true },
  });

  const centralPicks = (prediction?.rankingPicks ?? [])
    .filter((p) => p.league === "central")
    .sort((a, b) => a.rank - b.rank);

  const pacificPicks = (prediction?.rankingPicks ?? [])
    .filter((p) => p.league === "pacific")
    .sort((a, b) => a.rank - b.rank);

  // Fetch all 1st picks for boldness / consensus calculations
  const allPredictions = await db.query.predictions.findMany({
    where: eq(predictions.seasonId, season.id),
    with: { rankingPicks: true },
  });

  const allCentral1s: string[] = [];
  const allPacific1s: string[] = [];
  for (const pred of allPredictions) {
    for (const pick of pred.rankingPicks) {
      if (pick.rank === 1 && pick.league === "central")
        allCentral1s.push(pick.teamName);
      if (pick.rank === 1 && pick.league === "pacific")
        allPacific1s.push(pick.teamName);
    }
  }

  return {
    user: { name: user.name },
    centralPicks,
    pacificPicks,
    allCentral1s,
    allPacific1s,
  };
}

// ---------------------------------------------------------------------------
// Newspaper layout (Satori JSX)
// ---------------------------------------------------------------------------

function newspaperLayout(
  userName: string,
  year: number,
  article: { headline: string; subtext: string },
  centralPicks: { rank: number; teamName: string }[],
  pacificPicks: { rank: number; teamName: string }[],
) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFDF5",
        fontFamily: "NotoSansJP, sans-serif",
        color: "#1a1a1a",
        padding: "0",
        position: "relative",
      }}
    >
      {/* Top red bar */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "6px",
          backgroundColor: "#DC2626",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px 10px",
          borderBottom: "2px solid #1a1a1a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#DC2626",
            }}
          >
            NPB 予想リーグ
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 14,
              color: "#666",
            }}
          >
            {year}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 12,
            color: "#999",
          }}
        >
          npb-predictions.pages.dev
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "16px 32px 12px",
          gap: "24px",
        }}
      >
        {/* Left column: User + article */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "520px",
            gap: "12px",
          }}
        >
          {/* User name badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#2D5A27",
                color: "white",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {userName.charAt(0)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 900,
                color: "#1a1a1a",
              }}
            >
              {userName}
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 900,
                lineHeight: 1.3,
                color: "#1a1a1a",
                borderLeft: "4px solid #DC2626",
                paddingLeft: "12px",
              }}
            >
              {article.headline}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: "#555",
                paddingLeft: "16px",
                lineHeight: 1.5,
              }}
            >
              {article.subtext}
            </div>
          </div>

          {/* Decorative divider */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "1px",
              backgroundColor: "#ddd",
              margin: "4px 0",
            }}
          />

          {/* Mini stats row */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              fontSize: 11,
              color: "#888",
            }}
          >
            <div style={{ display: "flex" }}>
              セ本命: {centralPicks[0]?.teamName ?? "—"}
            </div>
            <div style={{ display: "flex" }}>
              パ本命: {pacificPicks[0]?.teamName ?? "—"}
            </div>
          </div>
        </div>

        {/* Right column: Rankings */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: "8px",
          }}
        >
          {/* Central League */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 13,
                fontWeight: 900,
                color: "#DC2626",
                borderBottom: "1px solid #DC2626",
                paddingBottom: "3px",
                marginBottom: "2px",
              }}
            >
              Central League
            </div>
            {centralPicks.map((pick) => (
              <RankRow
                key={`c-${pick.rank}`}
                rank={pick.rank}
                teamName={pick.teamName}
              />
            ))}
          </div>

          {/* Pacific League */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              marginTop: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 13,
                fontWeight: 900,
                color: "#1E40AF",
                borderBottom: "1px solid #1E40AF",
                paddingBottom: "3px",
                marginBottom: "2px",
              }}
            >
              Pacific League
            </div>
            {pacificPicks.map((pick) => (
              <RankRow
                key={`p-${pick.rank}`}
                rank={pick.rank}
                teamName={pick.teamName}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          width: "100%",
          padding: "6px 32px",
          backgroundColor: "#1a1a1a",
          color: "#ccc",
          fontSize: 11,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex" }}>
          {year} NPB Predictions League
        </div>
        <div style={{ display: "flex" }}>
          #NPB予想リーグ
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RankRow({ rank, teamName }: { rank: number; teamName: string }) {
  const team: NpbTeam | undefined = getTeamByName(teamName);
  const bgColor = team?.color ?? "#6b7280";
  const textColor = team?.textColor ?? "#fff";
  const isTop3 = rank <= 3;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        height: "30px",
      }}
    >
      {/* Rank number */}
      <div
        style={{
          display: "flex",
          width: "24px",
          fontSize: 14,
          fontWeight: isTop3 ? 900 : 700,
          color: isTop3 ? "#DC2626" : "#999",
          justifyContent: "flex-end",
        }}
      >
        {rank}
      </div>

      {/* Team color badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bgColor,
          color: textColor,
          borderRadius: "4px",
          padding: "2px 10px",
          fontSize: 13,
          fontWeight: 700,
          minWidth: "90px",
          height: "26px",
        }}
      >
        {teamName}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fallback card (no font needed)
// ---------------------------------------------------------------------------

function renderFallback() {
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
          backgroundColor: "#FFFDF5",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: 800,
            color: "#DC2626",
          }}
        >
          NPB 予想リーグ
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#666",
            marginTop: "12px",
          }}
        >
          {/* ASCII only — must render even when font load fails */}
          #NPB予想リーグ
        </div>
      </div>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT },
  );
}
