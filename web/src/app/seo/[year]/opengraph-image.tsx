import { ImageResponse } from "next/og";
import { getSeasonByYear, getFinalStandings } from "@/lib/seo-queries";

export const runtime = "edge";
export const alt = "NPB Predictions リーグ シーズン概要";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#fffbeb";
const INK = "#0a0a0a";
const RED = "#dc2626";
const MUTED = "#6b7280";

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

type Props = { params: Promise<{ year: string }> };

export default async function Image({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  let centralChampion = "";
  let pacificChampion = "";

  const season = await getSeasonByYear(Number.isNaN(year) ? new Date().getFullYear() : year);

  if (season) {
    const [centralStandings, pacificStandings] = await Promise.all([
      getFinalStandings(season.id, "central"),
      getFinalStandings(season.id, "pacific"),
    ]);

    centralChampion = centralStandings[0]?.teamName ?? "";
    pacificChampion = pacificStandings[0]?.teamName ?? "";
  }

  const fonts = await loadFonts().catch(() => []);
  if (fonts.length === 0) return await renderFallback();

  const champions: { label: string; team: string }[] = [];
  if (centralChampion) champions.push({ label: "セ・リーグ優勝", team: centralChampion });
  if (pacificChampion) champions.push({ label: "パ・リーグ優勝", team: pacificChampion });

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
              flexDirection: "column",
              borderBottom: `5px solid ${INK}`,
              paddingBottom: 18,
            }}
          >
            <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: RED }}>
              NPB予想スポーツ
            </div>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>
              {year}年シーズン
            </div>
          </div>

          {/* Champions */}
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", gap: 32 }}>
            {champions.length === 0 ? (
              <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
                シーズン進行中 — 最終順位は確定していません
              </div>
            ) : (
              champions.map((c) => (
                <div
                  key={c.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "24px 44px",
                    border: `3px solid ${INK}`,
                    minWidth: 320,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      background: RED,
                      color: PAPER,
                      padding: "4px 14px",
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 14,
                    }}
                  >
                    {c.label} 優勝
                  </div>
                  <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>
                    {c.team}
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
              paddingTop: 10,
              fontSize: 14,
              color: MUTED,
            }}
          >
            <div style={{ display: "flex" }}>順位予想・タイトル予想・的中率ランキング</div>
            <div style={{ display: "flex" }}>npb-predictions.pages.dev</div>
          </div>
        </div>
      ),
      { ...size, fonts },
    );
    return img;
  } catch (err) {
    console.error("Season OG render failed:", err);
    return await renderFallback();
  }
}
