export const runtime = "edge";

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getTeamBySlug } from "@/lib/teams";
import {
  getTeamNewspaperArticle,
  type HeadlineChar,
} from "@/lib/public-image-data";

const W = 1080;
const H = 1920;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: "normal";
};

// Tiled textShadow creates a faux stroke since Satori does not support -webkit-text-stroke.
function stroke(color: string, width: number): string {
  const offs: [number, number][] = [];
  for (let dx = -width; dx <= width; dx++) {
    for (let dy = -width; dy <= width; dy++) {
      if (dx * dx + dy * dy <= width * width && (dx !== 0 || dy !== 0)) {
        offs.push([dx, dy]);
      }
    }
  }
  return offs.map(([x, y]) => `${x}px ${y}px 0 ${color}`).join(", ");
}

async function loadJPFont(
  family: "serif" | "sans",
  weight: 400 | 700 | 900,
): Promise<ArrayBuffer> {
  const base =
    family === "serif"
      ? "https://cdn.jsdelivr.net/fontsource/fonts/noto-serif-jp@latest/japanese"
      : "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese";
  const res = await fetch(`${base}-${weight}-normal.ttf`);
  if (!res.ok) throw new Error(`Font ${family}/${weight} ${res.status}`);
  return res.arrayBuffer();
}

let fontPromise: Promise<OgFont[]> | null = null;

function loadFonts(): Promise<OgFont[]> {
  fontPromise ??= (async () => {
    const meta: Array<{
      family: "serif" | "sans";
      name: string;
      weight: 400 | 700 | 900;
    }> = [
      { family: "serif", name: "Serif JP", weight: 900 },
      { family: "serif", name: "Serif JP", weight: 400 },
      { family: "sans", name: "Sans JP", weight: 900 },
      { family: "sans", name: "Sans JP", weight: 700 },
      { family: "sans", name: "Sans JP", weight: 400 },
    ];

    const results = await Promise.allSettled(
      meta.map((font) => loadJPFont(font.family, font.weight)),
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
  { params }: { params: Promise<{ teamSlug: string }> },
) {
  const { teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);
  if (!team) return new Response(`Team not found: ${teamSlug}`, { status: 404 });

  const article = await getTeamNewspaperArticle(team);
  if (!article) {
    return Response.json(
      { error: "No live game or standings data for team", team: team.slug },
      { status: 404 },
    );
  }

  // Sports tabloid palette
  const paper = "#fffbeb"; // cream yellow-tinted paper
  const ink = "#0a0a0a";
  const red = "#dc2626";
  const yellow = "#facc15";
  const redDeep = "#991b1b";

  const fonts = await loadFonts();

  const renderHeadlineLine = (chars: HeadlineChar[]) => (
    <div style={{ display: "flex", alignItems: "flex-end", lineHeight: 1 }}>
      {chars.map((c, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            // 太ゴシックで「スポーツ紙感」を出す（明朝ではなく Sans JP 900）
            fontFamily: "Sans JP",
            fontSize: c.size,
            fontWeight: 900,
            lineHeight: 0.92,
            color: c.style === "solid" ? (c.color ?? ink) : "#fff",
            textShadow: c.style === "outline" ? stroke(ink, 6) : `6px 6px 0 ${ink}`,
            marginRight: -4,
          }}
        >
          {c.char}
        </div>
      ))}
    </div>
  );

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
          position: "relative",
        }}
      >
        {/* ── Masthead ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 40px 14px 40px",
            borderBottom: `4px solid ${ink}`,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <div
              style={{
                display: "flex",
                fontSize: 42,
                fontWeight: 900,
                color: red,
                letterSpacing: "0.08em",
              }}
            >
              NPB
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: 900,
                color: ink,
                letterSpacing: "0.04em",
              }}
            >
              予想スポーツ
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                color: "#666",
                marginLeft: 4,
              }}
            >
              {team.name}版
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: ink }}>
              {article.date}
            </div>
            <div style={{ display: "flex", fontSize: 14, color: "#666" }}>
              {article.edition} / 第 {new Date().getDate()} 号
            </div>
          </div>
        </div>

        {/* ── Team color banner ── */}
        <div style={{ display: "flex", height: 12, background: team.color }} />

        {/* ── Kicker banner (yellow) ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 40px",
            background: yellow,
            borderBottom: `3px solid ${ink}`,
          }}
        >
          <div
            style={{
              display: "flex",
              background: red,
              color: "#fff",
              padding: "6px 16px",
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: "0.1em",
              transform: "skewX(-8deg)",
            }}
          >
            速報
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 900, color: redDeep, letterSpacing: "0.05em" }}>
            {article.kicker}
          </div>
          <div style={{ display: "flex", marginLeft: "auto", fontSize: 16, color: ink, fontWeight: 700 }}>
            {team.name} vs {article.opponent} / {article.venue}
          </div>
        </div>

        {/* ── HEADLINE ZONE: yellow bg, mixed-size red+outlined characters ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "32px 40px 24px 40px",
            background: yellow,
            borderBottom: `5px solid ${ink}`,
          }}
        >
          {renderHeadlineLine(article.headlineLine1)}
          <div style={{ display: "flex", marginTop: 8 }}>
            {renderHeadlineLine(article.headlineLine2)}
          </div>
        </div>

        {/* Subheadline — yellow strip */}
        <div
          style={{
            display: "flex",
            padding: "14px 40px",
            background: yellow,
            borderTop: `3px solid ${ink}`,
            borderBottom: `3px solid ${ink}`,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 900, color: redDeep, letterSpacing: "0.04em" }}>
            {article.subheadline}
          </div>
        </div>

        {/* ── HUGE hero "photo" block — dominates layout ── */}
        <div style={{ display: "flex", padding: "16px 40px 0 40px", gap: 10 }}>
          {/* Left: main big photo block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              height: 420,
              background: team.color,
              color: team.textColor,
              alignItems: "center",
              justifyContent: "center",
              border: `4px solid ${ink}`,
              position: "relative",
            }}
          >
            {/* Score overlay inside the "photo" — top right */}
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 10,
                right: 10,
                padding: "6px 14px",
                background: "#fff",
                color: ink,
                border: `3px solid ${ink}`,
                fontSize: 36,
                fontWeight: 900,
              }}
            >
              {article.scoreLine}
            </div>
            {/* Big abbr */}
            <div style={{ display: "flex", fontSize: 300, fontWeight: 900, lineHeight: 0.9 }}>
              {team.abbr}
            </div>
            {/* Red caption bar at bottom */}
            <div
              style={{
                display: "flex",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: red,
                color: "#fff",
                padding: "10px 14px",
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: "0.03em",
              }}
            >
              &gt; {article.focusName}・{article.focusStat}
            </div>
          </div>
        </div>

        {/* ── Row of 4 framed photo thumbnails with red caption bars ── */}
        <div style={{ display: "flex", gap: 8, padding: "10px 40px 0 40px" }}>
          {[
            { label: team.shortName, color: team.color, textColor: team.textColor, caption: article.kicker },
            { label: article.facts[0].label, color: "#fff", textColor: ink, caption: article.facts[0].caption },
            { label: article.facts[1].label, color: "#fff", textColor: ink, caption: article.facts[1].caption },
            { label: article.facts[2].label, color: "#fff", textColor: ink, caption: article.facts[2].caption },
          ].map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                border: `3px solid ${ink}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 130,
                  background: t.color,
                  color: t.textColor,
                }}
              >
                <div style={{ display: "flex", fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: "0.02em" }}>
                  {t.label}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  background: red,
                  color: "#fff",
                  padding: "6px 8px",
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                }}
              >
                {t.caption}
              </div>
            </div>
          ))}
        </div>

        {/* ── Dramatic yellow banner (second headline) ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 40px",
            margin: "14px 0 0 0",
            background: yellow,
            borderTop: `4px solid ${ink}`,
            borderBottom: `4px solid ${ink}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Sans JP",
              fontSize: 64,
              fontWeight: 900,
              color: red,
              letterSpacing: "0.04em",
              textShadow: stroke(ink, 4),
            }}
          >
            {article.dramaticBanner}
          </div>
        </div>

        {/* ── Body article (2 columns, compact) ── */}
        <div
          style={{
            display: "flex",
            gap: 20,
            padding: "16px 40px 0 40px",
            fontFamily: "Serif JP",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1, fontSize: 19, lineHeight: 1.75, color: ink }}>
            <div style={{ display: "flex", marginBottom: 12 }}>{article.body[0]}</div>
            <div style={{ display: "flex" }}>{article.body[1]}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, fontSize: 19, lineHeight: 1.75, color: ink }}>
            <div style={{ display: "flex", marginBottom: 12 }}>{article.body[2]}</div>
            {/* Quote box in right column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "10px 14px",
                background: "#fff",
                border: `3px solid ${ink}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 13, fontWeight: 900, color: red, letterSpacing: "0.1em", fontFamily: "Sans JP" }}>
                &gt; データメモ
              </div>
              <div style={{ display: "flex", fontSize: 17, fontWeight: 700, color: ink, lineHeight: 1.45, marginTop: 4 }}>
                「{article.quote}」
              </div>
              <div style={{ display: "flex", fontSize: 13, color: "#666", marginTop: 6, justifyContent: "flex-end", fontFamily: "Sans JP" }}>
                — {article.quoteBy}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar: season stats ── */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            background: ink,
            color: paper,
            padding: "10px 40px",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 11, color: "#aaa", letterSpacing: "0.15em" }}>
              通算
            </div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 900 }}>{article.seasonRecord}</div>
          </div>
          <div style={{ display: "flex", width: 1, height: 30, background: "#555" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 11, color: "#aaa", letterSpacing: "0.15em" }}>
              順位
            </div>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 900, color: yellow }}>
              {article.leagueRank}
            </div>
          </div>
          <div style={{ display: "flex", width: 1, height: 30, background: "#555" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 11, color: "#aaa", letterSpacing: "0.15em" }}>
              次戦
            </div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 700 }}>{article.nextGame}</div>
          </div>
          <div style={{ display: "flex", marginLeft: "auto", fontSize: 12, color: "#777" }}>
            npb-predictions.pages.dev
          </div>
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
