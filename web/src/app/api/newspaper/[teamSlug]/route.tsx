export const runtime = "edge";

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getTeamBySlug } from "@/lib/teams";
import {
  getTeamNewspaperArticle,
  type HeadlineChar,
} from "@/lib/public-image-data";

const W = 720;
const H = 1280;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: "normal";
};

function stroke(color: string): string {
  return [
    `2px 0 0 ${color}`,
    `-2px 0 0 ${color}`,
    `0 2px 0 ${color}`,
    `0 -2px 0 ${color}`,
  ].join(", ");
}

async function loadJPFont(weight: 400 | 700 | 900): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-${weight}-normal.ttf`,
  );
  if (!res.ok) throw new Error(`Font sans/${weight} ${res.status}`);
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

  const paper = "#fffbeb";
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
            fontFamily: "Sans JP",
            fontSize: Math.round(c.size * 0.58),
            fontWeight: 900,
            lineHeight: 0.92,
            color: c.style === "solid" ? (c.color ?? ink) : "#fff",
            textShadow: c.style === "outline" ? stroke(ink) : `3px 3px 0 ${ink}`,
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
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 28px 10px",
            borderBottom: `4px solid ${ink}`,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 900, color: red }}>
              NPB
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 900 }}>
              予想スポーツ
            </div>
            <div style={{ display: "flex", fontSize: 15, color: "#666" }}>
              {team.name}版
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 17, fontWeight: 700 }}>
              {article.date}
            </div>
            <div style={{ display: "flex", fontSize: 12, color: "#666" }}>
              {article.edition} / 第 {new Date().getDate()} 号
            </div>
          </div>
        </div>

        <div style={{ display: "flex", height: 10, background: team.color }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 28px",
            background: yellow,
            borderBottom: `3px solid ${ink}`,
          }}
        >
          <div
            style={{
              display: "flex",
              background: red,
              color: "#fff",
              padding: "5px 14px",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "0.08em",
            }}
          >
            速報
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 900, color: redDeep }}>
            {article.kicker}
          </div>
          <div style={{ display: "flex", marginLeft: "auto", fontSize: 13, fontWeight: 700 }}>
            {article.venue}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "22px 28px 16px",
            background: yellow,
            borderBottom: `5px solid ${ink}`,
          }}
        >
          {renderHeadlineLine(article.headlineLine1)}
          <div style={{ display: "flex", marginTop: 8 }}>
            {renderHeadlineLine(article.headlineLine2)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            padding: "10px 28px",
            background: yellow,
            borderBottom: `3px solid ${ink}`,
          }}
        >
          <div style={{ display: "flex", fontSize: 23, fontWeight: 900, color: redDeep }}>
            {article.subheadline}
          </div>
        </div>

        <div style={{ display: "flex", padding: "12px 28px 0", gap: 10 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              height: 260,
              background: team.color,
              color: team.textColor,
              alignItems: "center",
              justifyContent: "center",
              border: `4px solid ${ink}`,
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 10,
                right: 10,
                padding: "5px 12px",
                background: "#fff",
                color: ink,
                border: `3px solid ${ink}`,
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              {article.scoreLine}
            </div>
            <div style={{ display: "flex", fontSize: 210, fontWeight: 900, lineHeight: 0.9 }}>
              {team.abbr}
            </div>
            <div
              style={{
                display: "flex",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: red,
                color: "#fff",
                padding: "8px 12px",
                fontSize: 17,
                fontWeight: 900,
              }}
            >
              &gt; {article.focusName}・{article.focusStat}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "8px 28px 0" }}>
          {[
            { label: team.shortName, color: team.color, textColor: team.textColor, caption: article.kicker },
            { label: article.facts[0].label, color: "#fff", textColor: ink, caption: article.facts[0].caption },
            { label: article.facts[1].label, color: "#fff", textColor: ink, caption: article.facts[1].caption },
            { label: article.facts[2].label, color: "#fff", textColor: ink, caption: article.facts[2].caption },
          ].map((item, i) => (
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
                  height: 78,
                  background: item.color,
                  color: item.textColor,
                }}
              >
                <div style={{ display: "flex", fontSize: 30, fontWeight: 900 }}>
                  {item.label}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  background: red,
                  color: "#fff",
                  padding: "5px 7px",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                {item.caption}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 28px",
            marginTop: 10,
            background: yellow,
            borderTop: `4px solid ${ink}`,
            borderBottom: `4px solid ${ink}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 900,
              color: red,
              textShadow: stroke(ink),
            }}
          >
            {article.dramaticBanner}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            padding: "12px 28px 0",
            fontSize: 15,
            lineHeight: 1.45,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", marginBottom: 8 }}>{article.body[0]}</div>
            <div style={{ display: "flex" }}>{article.body[1]}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", marginBottom: 8 }}>{article.body[2]}</div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "8px 12px",
                background: "#fff",
                border: `3px solid ${ink}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 12, fontWeight: 900, color: red }}>
                &gt; データメモ
              </div>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginTop: 4 }}>
                「{article.quote}」
              </div>
              <div style={{ display: "flex", fontSize: 11, color: "#666", marginTop: 6, justifyContent: "flex-end" }}>
                - {article.quoteBy}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            background: ink,
            color: paper,
            padding: "8px 28px",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 10, color: "#aaa" }}>通算</div>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 900 }}>{article.seasonRecord}</div>
          </div>
          <div style={{ display: "flex", width: 1, height: 28, background: "#555" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 10, color: "#aaa" }}>順位</div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 900, color: yellow }}>
              {article.leagueRank}
            </div>
          </div>
          <div style={{ display: "flex", width: 1, height: 28, background: "#555" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 10, color: "#aaa" }}>次戦</div>
            <div style={{ display: "flex", fontSize: 13, fontWeight: 700 }}>{article.nextGame}</div>
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
