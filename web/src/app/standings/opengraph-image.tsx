import { ImageResponse } from "next/og";
import { getDb } from "@/db";
import { eq, desc } from "drizzle-orm";
import { seasons, scoreSnapshots } from "@/db/schema";

export const runtime = "edge";
export const alt = "NPB Predictions League スコアボード";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#fffbeb";
const INK = "#0a0a0a";
const RED = "#dc2626";
const MUTED = "#6b7280";
const RULE = "#d6d0bb";

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
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        NPB Predictions League
      </div>
    ),
    size,
  );
}

export default async function Image() {
  const year = new Date().getFullYear();

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  let entries: { name: string; totalScore: number; rankingScore: number; titleScore: number }[] = [];

  if (season) {
    const scores = await getDb().query.scoreSnapshots.findMany({
      where: eq(scoreSnapshots.seasonId, season.id),
      orderBy: [desc(scoreSnapshots.totalScore)],
      with: { user: true },
    });

    const seen = new Set<number>();
    entries = scores
      .filter((s) => {
        if (seen.has(s.userId)) return false;
        seen.add(s.userId);
        return true;
      })
      .slice(0, 5)
      .map((s) => ({
        name: s.user.name,
        totalScore: s.totalScore,
        rankingScore: s.rankingScore,
        titleScore: s.titleScore,
      }));
  }

  const fonts = await loadFonts().catch(() => []);
  if (fonts.length === 0) return await renderFallback();

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
                NPB予想スポーツ
              </div>
              <div style={{ display: "flex", fontSize: 46, fontWeight: 700 }}>
                {year} スコアボード
              </div>
            </div>
            <div
              style={{
                display: "flex",
                background: INK,
                color: PAPER,
                padding: "8px 18px",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              総合成績
            </div>
          </div>

          {/* Scoreboard rows */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 16 }}>
            {entries.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  color: MUTED,
                }}
              >
                まだスコアデータがありません
              </div>
            ) : (
              entries.map((entry, idx) => (
                <div
                  key={entry.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 6px",
                    background: idx === 0 ? "rgba(220,38,38,0.07)" : "transparent",
                    borderBottom: idx < entries.length - 1 ? `1px solid ${RULE}` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 56,
                      fontSize: 30,
                      fontWeight: 700,
                      color: idx === 0 ? RED : INK,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ display: "flex", flex: 1, fontSize: 27, fontWeight: 700 }}>
                    {entry.name}
                  </div>
                  <div style={{ display: "flex", fontSize: 15, color: MUTED, marginRight: 24 }}>
                    順位{entry.rankingScore} + タイトル{entry.titleScore}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      minWidth: 120,
                      justifyContent: "flex-end",
                      fontSize: 32,
                      fontWeight: 700,
                      color: idx === 0 ? RED : INK,
                    }}
                  >
                    {entry.totalScore}pt
                  </div>
                </div>
              ))
            )}
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
            <div style={{ display: "flex" }}>順位予想・タイトル予想の合計点ランキング</div>
            <div style={{ display: "flex" }}>npb-predictions.pages.dev</div>
          </div>
        </div>
      ),
      { ...size, fonts },
    );
    return img;
  } catch (err) {
    console.error("Standings OG render failed:", err);
    return await renderFallback();
  }
}
