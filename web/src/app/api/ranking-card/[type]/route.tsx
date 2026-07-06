export const runtime = "edge";

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import {
  getRankingCardData,
  type RankingCardData,
} from "@/lib/public-image-data";

const W = 720;
const H = 880;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: "normal";
};

async function loadJPFont(weight: 400 | 700 | 900): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-${weight}-normal.ttf`,
  );
  if (!res.ok) throw new Error(`Font sans/${weight}`);
  return res.arrayBuffer();
}

let fontPromise: Promise<OgFont[]> | null = null;

function loadFonts(): Promise<OgFont[]> {
  fontPromise ??= (async () => {
    const meta: Array<{ name: string; weight: 400 | 700 | 900 }> = [
      { name: "Sans JP", weight: 900 },
      { name: "Sans JP", weight: 700 },
      { name: "Sans JP", weight: 400 },
    ];
    const results = await Promise.allSettled(
      meta.map((font) => loadJPFont(font.weight)),
    );

    return results
      .map((result, i) =>
        result.status === "fulfilled"
          ? {
              name: meta[i].name,
              data: result.value,
              weight: meta[i].weight,
              style: "normal" as const,
            }
          : null,
      )
      .filter((font): font is OgFont => font !== null);
  })();

  return fontPromise;
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

  const ink = "#111827";
  const paper = "#ffffff";
  const accent = "#dc2626";
  const fonts = await loadFonts();

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
          padding: 22,
          border: `3px solid ${ink}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `4px solid ${ink}`,
            paddingBottom: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 14, fontWeight: 900, color: accent }}>
              NPB予想スポーツ
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 900 }}>
              {data.title}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              background: ink,
              color: "#fff",
              padding: "8px 12px",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            上位5傑
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 12, gap: 10 }}>
          {data.sections.map((section, si) => (
            <div
              key={section.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                border: `2px solid ${ink}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: si === 0 ? accent : ink,
                  color: "#fff",
                  padding: "6px 10px",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {section.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                {section.rows.map((row, ri) => (
                  <div
                    key={`${section.label}-${row.name}-${ri}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 34,
                      padding: "4px 10px",
                      borderBottom:
                        ri < section.rows.length - 1 ? "1px solid #d1d5db" : "none",
                      fontSize: 15,
                    }}
                  >
                    <div style={{ display: "flex", width: 30, fontWeight: 900 }}>
                      {ri + 1}
                    </div>
                    <div style={{ display: "flex", flex: 1, fontWeight: 700 }}>
                      {row.name}
                    </div>
                    <div style={{ display: "flex", width: 130, color: "#4b5563" }}>
                      {row.affiliation}
                    </div>
                    <div style={{ display: "flex", width: 48, justifyContent: "center" }}>
                      {row.role}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: 70,
                        justifyContent: "flex-end",
                        fontSize: 19,
                        fontWeight: 900,
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `2px solid ${ink}`,
            marginTop: 10,
            paddingTop: 8,
            fontSize: 11,
            color: "#4b5563",
          }}
        >
          <div style={{ display: "flex" }}>{data.note}</div>
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
