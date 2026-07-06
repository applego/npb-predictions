export const runtime = "edge";

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import {
  getRankingCardData,
  type RankingCardData,
} from "@/lib/public-image-data";

const W = 900;
const H = 1100;

async function loadJPFont(
  family: "serif" | "sans",
  weight: 400 | 700 | 900,
): Promise<ArrayBuffer> {
  const base =
    family === "serif"
      ? "https://cdn.jsdelivr.net/fontsource/fonts/noto-serif-jp@latest/japanese"
      : "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese";
  const res = await fetch(`${base}-${weight}-normal.ttf`);
  if (!res.ok) throw new Error(`Font ${family}/${weight}`);
  return res.arrayBuffer();
}

// Black-circle rank badge (replaces ❶❷❸❹❺ which require emoji font).
function RankBadge({ n, size = 30, ink = "#1a1a1a" }: { n: number; size?: number; ink?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: ink,
        color: "#fff",
        fontSize: size * 0.6,
        fontWeight: 900,
        lineHeight: 1,
      }}
    >
      {n}
    </div>
  );
}

interface Row {
  name: string;
  affiliation: string;
  year: string;
  role: string;
  value: string;
}

interface Section {
  label: string; // 縦書きラベル: "出塁率" → 縦にスタック
  rows: Row[];
}

// Space out a name: "村上宗隆" → "村 上 宗 隆" (with extra gap)
function spaceName(s: string, targetLen = 6): string {
  const chars = [...s];
  // Insert narrow spaces between every char
  const spaced = chars.join(" ");
  // Pad up to target visual length if shorter
  const padding = Math.max(0, targetLen - chars.length);
  return " ".repeat(padding * 2) + spaced;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  await params;
  const data: RankingCardData | null = await getRankingCardData();
  if (!data) {
    return Response.json(
      { error: "No live ranking score data available" },
      { status: 404 },
    );
  }

  const ink = "#1a1a1a";
  const paper = "#ffffff";

  const fontResults = await Promise.allSettled([
    loadJPFont("sans", 900),
    loadJPFont("sans", 700),
    loadJPFont("sans", 400),
    loadJPFont("serif", 700),
  ]);
  const meta: Array<{ name: string; weight: 400 | 700 | 900 }> = [
    { name: "Sans JP", weight: 900 },
    { name: "Sans JP", weight: 700 },
    { name: "Sans JP", weight: 400 },
    { name: "Serif JP", weight: 700 },
  ];
  const fonts = fontResults
    .map((r, i) =>
      r.status === "fulfilled"
        ? { name: meta[i].name, data: r.value, weight: meta[i].weight, style: "normal" as const }
        : null,
    )
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: paper,
          color: ink,
          fontFamily: "Sans JP",
          padding: 24,
          border: `3px solid ${ink}`,
        }}
      >
        {/* ── Title banner ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 20px",
            borderTop: `3px solid ${ink}`,
            borderBottom: `3px solid ${ink}`,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.08em",
            fontFamily: "Sans JP",
          }}
        >
          {data.title}
        </div>

        {/* Column headers row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 0 8px 80px",
            borderBottom: `2px solid ${ink}`,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          <div style={{ display: "flex", width: 60 }}>順位</div>
          <div style={{ display: "flex", flex: 1 }}>選　　　手</div>
          <div style={{ display: "flex", width: 170 }}>（所属）</div>
          <div style={{ display: "flex", width: 70, justifyContent: "center" }}>年度</div>
          <div style={{ display: "flex", width: 70, justifyContent: "center" }}>種別</div>
          <div style={{ display: "flex", width: 110, justifyContent: "flex-end", paddingRight: 60 }}>スコア</div>
        </div>

        {/* ── Body: 3 sections with vertical-stacked labels on left ── */}
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          {data.sections.map((section, si) => (
            <div
              key={si}
              style={{
                display: "flex",
                flex: 1,
                borderBottom: si < data.sections.length - 1 ? `2px solid ${ink}` : "none",
                position: "relative",
              }}
            >
              {/* Vertical label: stack characters top-to-bottom */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 60,
                  borderRight: `2px solid ${ink}`,
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                  lineHeight: 1.2,
                }}
              >
                {[...section.label].map((ch, ci) => (
                  <div key={ci} style={{ display: "flex" }}>
                    {ch}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                {section.rows.map((row, ri) => (
                  <div
                    key={ri}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: 1,
                      padding: "0 12px 0 20px",
                      borderBottom:
                        ri < section.rows.length - 1 ? `1px solid #ccc` : "none",
                      fontSize: 20,
                      fontFamily: "Serif JP",
                    }}
                  >
                    <div style={{ display: "flex", width: 40 }}>
                      <RankBadge n={ri + 1} size={30} ink={ink} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flex: 1,
                        fontSize: 24,
                        fontWeight: 700,
                        letterSpacing: "0.3em",
                      }}
                    >
                      {row.name}
                    </div>
                    <div style={{ display: "flex", width: 170, fontSize: 18, color: "#444" }}>
                      （{row.affiliation}）
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: 70,
                        justifyContent: "center",
                        fontSize: 20,
                        fontFamily: "Sans JP",
                        fontWeight: 700,
                      }}
                    >
                      {row.year}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: 70,
                        justifyContent: "center",
                        fontSize: 20,
                        fontFamily: "Sans JP",
                        fontWeight: 700,
                      }}
                    >
                      {row.role}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: 110,
                        justifyContent: "flex-end",
                        paddingRight: 10,
                        fontSize: 26,
                        fontFamily: "Sans JP",
                        fontWeight: 900,
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right side: vertical-stacked note on first section only */}
              {si === 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 44,
                    borderLeft: `2px solid ${ink}`,
                    padding: "16px 0",
                    fontSize: 14,
                    lineHeight: 1.45,
                    color: ink,
                  }}
                >
                  {[...data.note].map((ch, ci) => (
                    <div key={ci} style={{ display: "flex" }}>
                      {ch}
                    </div>
                  ))}
                </div>
              )}
              {si > 0 && (
                <div
                  style={{
                    display: "flex",
                    width: 44,
                    borderLeft: `2px solid ${ink}`,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0 0 0",
            borderTop: `2px solid ${ink}`,
            marginTop: 6,
            fontSize: 12,
            color: "#666",
          }}
        >
          <div style={{ display: "flex" }}>NPB予想スポーツ — 記録コーナー</div>
          <div style={{ display: "flex" }}>npb-predictions.pages.dev</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      ...(fonts.length > 0 ? { fonts } : {}),
    },
  );
}
