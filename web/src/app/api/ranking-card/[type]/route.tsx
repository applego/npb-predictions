export const runtime = "edge";

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import {
  getRankingCardData,
  type RankingCardData,
} from "@/lib/public-image-data";

const W = 560;
const H = 700;
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 700;
  style: "normal";
};

let fontPromise: Promise<ArrayBuffer> | null = null;

function displayText(value: string): string {
  return value.normalize("NFKC");
}

function loadFont(): Promise<ArrayBuffer> {
  fontPromise ??= (async () => {
    const fontUrl = new URL(
      "./assets/noto-sans-jp-japanese-700-normal.woff",
      import.meta.url,
    );
    const res = await fetch(fontUrl);
    if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 1000) throw new Error("Font response too small");
    return buf;
  })();

  return fontPromise;
}

async function renderFallbackCard(label: string): Promise<Response> {
  const img = new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#fff",
          color: "#111827",
          fontFamily: "sans-serif",
          border: "3px solid #111827",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
          NPB Rankings
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 14 }}>
          {label}
        </div>
      </div>
    ),
    { width: W, height: H },
  );
  const buf = await img.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": CACHE_CONTROL,
    },
  });
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
  const fontData = await loadFont().catch((err) => {
    console.error("Ranking card font load failed:", err);
    return null;
  });
  if (!fontData) return await renderFallbackCard("Font unavailable");

  const renderData = {
    ...data,
    title: displayText(data.title),
    note: displayText(data.note),
    sections: data.sections.map((section) => ({
      ...section,
      label: displayText(section.label),
      rows: section.rows.map((row) => ({
        ...row,
        name: displayText(row.name),
        affiliation: displayText(row.affiliation),
        role: displayText(row.role),
        value: displayText(row.value),
      })),
    })),
  };

  try {
    const img = new ImageResponse(
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: paper,
          color: ink,
          fontFamily: "NotoSansJP",
          padding: 18,
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
            <div style={{ display: "flex", fontSize: 12, fontWeight: 700, color: accent }}>
              NPB予想スポーツ
            </div>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700 }}>
              {renderData.title}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              background: ink,
              color: "#fff",
              padding: "6px 10px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            上位5傑
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 12, gap: 10 }}>
          {renderData.sections.map((section, si) => (
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
                  padding: "5px 8px",
                  fontSize: 15,
                  fontWeight: 700,
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
                      minHeight: 28,
                      padding: "3px 8px",
                      borderBottom:
                        ri < section.rows.length - 1 ? "1px solid #d1d5db" : "none",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", width: 24, fontWeight: 700 }}>
                      {ri + 1}
                    </div>
                    <div style={{ display: "flex", flex: 1, fontWeight: 700 }}>
                      {row.name}
                    </div>
                    <div style={{ display: "flex", width: 104, color: "#4b5563" }}>
                      {row.affiliation}
                    </div>
                    <div style={{ display: "flex", width: 38, justifyContent: "center" }}>
                      {row.role}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: 56,
                        justifyContent: "flex-end",
                        fontSize: 15,
                        fontWeight: 700,
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
            marginTop: 8,
            paddingTop: 6,
            fontSize: 9,
            color: "#4b5563",
          }}
        >
          <div style={{ display: "flex" }}>{renderData.note}</div>
          <div style={{ display: "flex" }}>npb-predictions.pages.dev</div>
        </div>
      </div>
      ,
      {
        width: W,
        height: H,
        fonts: [
          {
            name: "NotoSansJP",
            data: fontData,
            weight: 700,
            style: "normal",
          } satisfies OgFont,
        ],
      },
    );
    const buf = await img.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": CACHE_CONTROL,
      },
    });
  } catch (err) {
    console.error("Ranking card render failed:", err);
    return await renderFallbackCard("Render fallback");
  }
}
