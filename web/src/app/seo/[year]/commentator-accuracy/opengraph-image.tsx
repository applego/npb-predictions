import { ImageResponse } from "next/og";
import { getTopCommentatorsForYear } from "@/lib/commentator-queries";

export const runtime = "edge";
export const alt = "NPB Predictions 解説者的中率ランキング";
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

type Props = { params: Promise<{ year: string }> };

export default async function Image({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  const commentators = await getTopCommentatorsForYear(
    Number.isNaN(year) ? new Date().getFullYear() : year,
    5,
  );

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
                {year}年 解説者ランキング
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
              的中率番付
            </div>
          </div>

          {/* Ranking rows */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 16 }}>
            {commentators.length === 0 ? (
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
                データがありません
              </div>
            ) : (
              commentators.map((c, idx) => (
                <div
                  key={c.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 6px",
                    background: idx === 0 ? "rgba(220,38,38,0.07)" : "transparent",
                    borderBottom: idx < commentators.length - 1 ? `1px solid ${RULE}` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 56,
                      fontSize: 26,
                      fontWeight: 700,
                      color: idx === 0 ? RED : INK,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ display: "flex", flex: 1, fontSize: 27, fontWeight: 700 }}>
                    {c.name}
                  </div>
                  <div style={{ display: "flex", fontSize: 15, color: MUTED, marginRight: 24 }}>
                    セ{c.centralScore > 0 ? `+${c.centralScore}` : c.centralScore} / パ
                    {c.pacificScore > 0 ? `+${c.pacificScore}` : c.pacificScore}
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
                    {c.totalScore > 0 ? `+${c.totalScore}` : c.totalScore}pt
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
            <div style={{ display: "flex" }}>解説者・評論家 順位予想の的中率ランキング</div>
            <div style={{ display: "flex" }}>npb-predictions.pages.dev</div>
          </div>
        </div>
      ),
      { ...size, fonts },
    );
    return img;
  } catch (err) {
    console.error("Commentator accuracy OG render failed:", err);
    return await renderFallback();
  }
}
