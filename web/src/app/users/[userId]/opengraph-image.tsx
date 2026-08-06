import { ImageResponse } from "next/og";
import { getDb } from "@/db";
import { eq, and } from "drizzle-orm";
import { users, seasons, predictions } from "@/db/schema";

export const runtime = "edge";
export const alt = "ユーザーの順位予想カード";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#fffbeb";
const INK = "#0a0a0a";
const RED = "#dc2626";
const MUTED = "#6b7280";
const RULE = "#d6d0bb";

const LEAGUE_LABELS: Record<string, string> = {
  central: "セ・リーグ",
  pacific: "パ・リーグ",
};

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

type OgFont = { name: "Sans JP"; data: ArrayBuffer; weight: 700; style: "normal" };

let fontPromise: Promise<OgFont[]> | null = null;

function loadFonts(): Promise<OgFont[]> {
  fontPromise ??= (async () => {
    const res = await fetch(
      "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.ttf",
    );
    if (!res.ok) return [];
    const data = await res.arrayBuffer();
    if (data.byteLength < 1000) return [];
    return [{ name: "Sans JP", data, weight: 700, style: "normal" }];
  })();
  return fontPromise;
}

async function renderFallback(): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PAPER,
          color: INK,
          fontSize: 36,
          fontWeight: 700,
        }}
      >
        NPB Predictions League
      </div>
    ),
    size,
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr, 10);

  const user = await getDb().query.users.findFirst({
    where: eq(users.id, userId),
  });

  const fonts = await loadFonts().catch(() => []);
  if (fonts.length === 0) return await renderFallback();

  if (!user) return await renderFallback();

  const year = new Date().getFullYear();
  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  let centralPicks: { rank: number; teamName: string }[] = [];
  let pacificPicks: { rank: number; teamName: string }[] = [];

  if (season) {
    const prediction = await getDb().query.predictions.findFirst({
      where: and(
        eq(predictions.userId, userId),
        eq(predictions.seasonId, season.id),
      ),
      with: { rankingPicks: true },
    });

    if (prediction) {
      centralPicks = prediction.rankingPicks
        .filter((p) => p.league === "central")
        .sort((a, b) => a.rank - b.rank);
      pacificPicks = prediction.rankingPicks
        .filter((p) => p.league === "pacific")
        .sort((a, b) => a.rank - b.rank);
    }
  }

  try {
    const img = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: PAPER,
            color: INK,
            fontFamily: "Sans JP",
            padding: "44px 64px",
            borderTop: `10px solid ${INK}`,
            borderBottom: `10px solid ${INK}`,
          }}
        >
          {/* Masthead */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              borderBottom: `5px solid ${INK}`,
              paddingBottom: 18,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: RED }}>
                NPB予想スポーツ {year}
              </div>
              <div style={{ display: "flex", fontSize: 46, fontWeight: 700 }}>
                {user.name} の順位予想
              </div>
            </div>
            <div
              style={{
                display: "flex",
                width: 72,
                height: 72,
                alignItems: "center",
                justifyContent: "center",
                background: INK,
                color: PAPER,
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              {user.name.charAt(0)}
            </div>
          </div>

          {/* League columns */}
          <div style={{ display: "flex", gap: 48, flex: 1, paddingTop: 20 }}>
            {[
              { label: LEAGUE_LABELS.central, picks: centralPicks },
              { label: LEAGUE_LABELS.pacific, picks: pacificPicks },
            ].map((league) => (
              <div
                key={league.label}
                style={{ display: "flex", flexDirection: "column", flex: 1 }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 700,
                    color: RED,
                    borderBottom: `3px solid ${INK}`,
                    paddingBottom: 8,
                    marginBottom: 8,
                  }}
                >
                  {league.label}
                </div>
                {league.picks.map((pick, ri) => (
                  <div
                    key={`${league.label}-${pick.rank}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 0",
                      fontSize: 22,
                      borderBottom: ri < league.picks.length - 1 ? `1px solid ${RULE}` : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: 40,
                        fontWeight: 700,
                        color: pick.rank <= 3 ? RED : INK,
                      }}
                    >
                      {pick.rank}位
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: 8,
                        height: 24,
                        background: TEAM_COLORS[pick.teamName] ?? MUTED,
                      }}
                    />
                    <div style={{ display: "flex", fontWeight: 700 }}>{pick.teamName}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: `2px solid ${INK}`,
              marginTop: 12,
              paddingTop: 10,
              fontSize: 14,
              color: MUTED,
            }}
          >
            <div style={{ display: "flex" }}>順位予想・タイトル予想リーグ</div>
            <div style={{ display: "flex" }}>npb-predictions.pages.dev</div>
          </div>
        </div>
      ),
      { ...size, fonts },
    );
    return img;
  } catch (err) {
    console.error("User prediction OG render failed:", err);
    return await renderFallback();
  }
}
