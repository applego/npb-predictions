import { ImageResponse } from "next/og";
import { getDb } from "@/db";
import { eq, desc } from "drizzle-orm";
import { seasons, scoreSnapshots } from "@/db/schema";

export const runtime = "edge";
export const alt = "NPB Predictions League スコアボード";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ── masthead tokens (matches /newspaper page's paper design) ──
const PAPER = "#f6f4ed";
const INK = "#1a1712";
const RULE = "#b8af98";
const MUTE = "#3a352a";
const MONO = "#5b5443";
const RED = "#8a1f1f";

// ── kanji typesetting (same helpers as /newspaper page.tsx) ──
const KANJI = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function numToKanji(n: number): string {
  if (n < 0) return String(n);
  if (n < 10) return KANJI[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensStr = tens === 1 ? "十" : KANJI[tens] + "十";
  return tensStr + (ones ? KANJI[ones] : "");
}

function digitsToKanji(n: number): string {
  return String(n)
    .split("")
    .map((d) => KANJI[Number(d)])
    .join("");
}

function editionDate(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  const wd = ["日", "月", "火", "水", "木", "金", "土"][now.getUTCDay()];
  const reiwa = y - 2018;
  const reiwaStr = reiwa === 1 ? "元" : numToKanji(reiwa);
  return `${digitsToKanji(y)}年（令和${reiwaStr}年）${numToKanji(m)}月${numToKanji(d)}日　${wd}曜日`;
}

type OgFont = { name: string; data: ArrayBuffer; weight: 700 | 800; style: "normal" };

let fontPromise: Promise<OgFont[]> | null = null;

function loadFonts(): Promise<OgFont[]> {
  fontPromise ??= (async () => {
    const [minchoRes, sansRes] = await Promise.allSettled([
      fetch("https://cdn.jsdelivr.net/fontsource/fonts/shippori-mincho-b1@latest/japanese-800-normal.ttf"),
      fetch("https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.ttf"),
    ]);
    const fonts: OgFont[] = [];
    if (minchoRes.status === "fulfilled" && minchoRes.value.ok) {
      const data = await minchoRes.value.arrayBuffer();
      if (data.byteLength > 1000) fonts.push({ name: "Mincho", data, weight: 800, style: "normal" });
    }
    if (sansRes.status === "fulfilled" && sansRes.value.ok) {
      const data = await sansRes.value.arrayBuffer();
      if (data.byteLength > 1000) fonts.push({ name: "Sans JP", data, weight: 700, style: "normal" });
    }
    return fonts;
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
  if (fonts.length < 2) return await renderFallback();

  const leader = entries[0];
  const second = entries[1];
  const margin = leader && second ? leader.totalScore - second.totalScore : null;
  const headlineStatus = margin === null ? "" : margin >= 3 ? "独走" : "接戦";

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
            padding: "36px 56px",
            borderTop: `6px solid ${INK}`,
            borderBottom: `6px solid ${INK}`,
          }}
        >
          {/* Masthead */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Mincho",
                  fontSize: 38,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                ＮＰＢ予想新聞
              </div>
              <div style={{ display: "flex", fontSize: 12, letterSpacing: "0.16em", color: MONO }}>
                NPB PREDICTIONS PRESS
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                fontSize: 13,
                color: MUTE,
              }}
            >
              <div style={{ display: "flex" }}>{editionDate()}</div>
              <div style={{ display: "flex", fontSize: 11, color: MONO, letterSpacing: "0.08em" }}>
                第{digitsToKanji(year)}号 ／ スコアボード面
              </div>
            </div>
          </div>

          <div style={{ display: "flex", height: 3, background: INK, marginTop: 14, marginBottom: 22 }} />

          {/* Headline + table */}
          <div style={{ display: "flex", flex: 1, gap: 40 }}>
            {/* Headline column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 320,
                borderRight: `1px solid ${RULE}`,
                paddingRight: 40,
              }}
            >
              {leader ? (
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 16,
                      fontWeight: 700,
                      color: RED,
                      letterSpacing: "0.1em",
                      marginBottom: 10,
                    }}
                  >
                    ［首位］
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Mincho",
                      fontSize: 44,
                      fontWeight: 800,
                      lineHeight: 1.15,
                    }}
                  >
                    {leader.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Mincho",
                      fontSize: 30,
                      fontWeight: 800,
                      marginTop: 6,
                      color: RED,
                    }}
                  >
                    {leader.totalScore}点で{headlineStatus || "首位"}
                  </div>
                  <div style={{ display: "flex", fontSize: 13, color: MONO, marginTop: 12 }}>
                    順位{leader.rankingScore} ＋ タイトル{leader.titleScore}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", fontSize: 20, color: MUTE }}>
                  まだスコアデータがありません
                </div>
              )}
            </div>

            {/* Score table */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 4 }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Mincho",
                  fontSize: 20,
                  fontWeight: 800,
                  marginBottom: 12,
                  borderBottom: `2px solid ${INK}`,
                  paddingBottom: 8,
                }}
              >
                合計得点ランキング
              </div>
              {entries.map((entry, idx) => (
                <div
                  key={entry.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 4px",
                    borderBottom: idx < entries.length - 1 ? `1px solid ${RULE}` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 44,
                      fontFamily: "Mincho",
                      fontSize: 22,
                      fontWeight: 800,
                      color: idx === 0 ? RED : INK,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ display: "flex", flex: 1, fontSize: 22, fontWeight: 700 }}>
                    {entry.name}
                  </div>
                  <div style={{ display: "flex", fontSize: 13, color: MONO, marginRight: 20 }}>
                    順位{entry.rankingScore} ＋ タイトル{entry.titleScore}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      minWidth: 96,
                      justifyContent: "flex-end",
                      fontFamily: "Mincho",
                      fontSize: 26,
                      fontWeight: 800,
                      color: idx === 0 ? RED : INK,
                    }}
                  >
                    {entry.totalScore}点
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: `1px solid ${RULE}`,
              marginTop: 10,
              paddingTop: 10,
              fontSize: 12,
              color: MONO,
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
