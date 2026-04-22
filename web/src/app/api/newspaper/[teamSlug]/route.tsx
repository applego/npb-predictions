export const runtime = "edge";

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getTeamBySlug, type NpbTeam } from "@/lib/teams";

const W = 1080;
const H = 1920;

// Per-character headline styling — for スポニチ-style mixed-size typography.
// "solid" = fat colored fill (subject/emphasis), "outline" = white fill with black stroke via textShadow
type HeadlineChar = {
  char: string;
  size: number;
  style: "solid" | "outline";
  color?: string; // for solid
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

interface MockArticle {
  date: string;
  edition: string;
  kicker: string;
  dramaticBanner: string; // 下部の派手な黄色バナー
  headlineLine1: HeadlineChar[];
  headlineLine2: HeadlineChar[];
  subheadline: string;
  opponent: string;
  opponentAbbr: string;
  ourScore: number;
  oppScore: number;
  venue: string;
  heroName: string; // ヒーロー写真キャプション
  heroStat: string; // "決勝ソロ / 3打数2安打"
  photos: { label: string; stat: string; caption: string }[]; // 脇の小写真ブロック
  body: string[];
  seasonRecord: string;
  leagueRank: string;
  nextGame: string;
  quote: string; // 監督コメント
  quoteBy: string;
}

function buildMockArticle(team: NpbTeam): MockArticle {
  const red = "#dc2626";
  const subject = team.shortName[0];

  return {
    date: "2026年4月20日",
    edition: "朝刊",
    kicker: "首位攻防!!",
    dramaticBanner: "WBC候補 木浪 爆誕!!", // second dramatic yellow banner
    // Tabloid style: subject HUGE red solid, action chars outlined
    headlineLine1: [
      { char: subject, size: 260, style: "solid", color: red },
      { char: "、", size: 100, style: "outline" },
      { char: "延", size: 160, style: "outline" },
      { char: "長", size: 160, style: "outline" },
    ],
    headlineLine2: [
      { char: "サ", size: 180, style: "outline" },
      { char: "ヨ", size: 180, style: "outline" },
      { char: "ナ", size: 180, style: "outline" },
      { char: "ラ", size: 180, style: "outline" },
      { char: "！", size: 280, style: "solid", color: red },
    ],
    subheadline: "9回2死から奇跡の同点 11回木浪 劇的決勝ソロ",
    opponent: "読売ジャイアンツ",
    opponentAbbr: "巨",
    ourScore: 5,
    oppScore: 4,
    venue: "甲子園",
    heroName: "木浪 聖也",
    heroStat: "延長11回 決勝本塁打",
    photos: [
      { label: "近本", stat: "2安打2打点", caption: "9回 反撃の口火" },
      { label: "中野", stat: "同点適時打", caption: "2死からの一撃" },
      { label: "才木", stat: "7回2失点", caption: "粘投で試合作る" },
    ],
    body: [
      "19日の甲子園球場。満員の虎ファンが見守る中、阪神が劇的な幕切れで巨人を破り連勝とした。2点を追う9回裏、二死から近本の二塁打で反撃の狼煙をあげると、続く中野が右翼線に同点適時二塁打を運び、球場のボルテージは最高潮に達した。",
      "延長11回、先頭打者の木浪がカウント2-2から甘く入った変化球を完璧に捉え、左中間スタンドへ叩き込む決勝ソロ。ベンチを飛び出した選手たちがホームベース付近で木浪を迎え、夜空に虎のチャンスマーチが響きわたった。",
      "投手陣も光った。先発の才木は7回途中まで自責点2の好投で試合を作り、継投した石井、湯浅、岩崎の3投手が無失点リレー。この勝利で阪神は貯金6、首位巨人との差を0.5ゲームに詰めた。",
    ],
    seasonRecord: "11勝 5敗",
    leagueRank: "セ・リーグ 2位",
    nextGame: "4/21 vs DeNA @ 横浜",
    quote: "9回の粘りが全て。選手が最後まで諦めなかった",
    quoteBy: "岡田監督",
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamSlug: string }> },
) {
  const { teamSlug } = await params;
  const team = getTeamBySlug(teamSlug);
  if (!team) return new Response(`Team not found: ${teamSlug}`, { status: 404 });

  const article = buildMockArticle(team);

  // Sports tabloid palette
  const paper = "#fffbeb"; // cream yellow-tinted paper
  const ink = "#0a0a0a";
  const red = "#dc2626";
  const yellow = "#facc15";
  const redDeep = "#991b1b";

  const fontResults = await Promise.allSettled([
    loadJPFont("serif", 900),
    loadJPFont("serif", 400),
    loadJPFont("sans", 900),
    loadJPFont("sans", 700),
    loadJPFont("sans", 400),
  ]);
  const meta: Array<{ name: string; weight: 400 | 700 | 900 }> = [
    { name: "Serif JP", weight: 900 },
    { name: "Serif JP", weight: 400 },
    { name: "Sans JP", weight: 900 },
    { name: "Sans JP", weight: 700 },
    { name: "Sans JP", weight: 400 },
  ];
  const fonts = fontResults
    .map((r, i) =>
      r.status === "fulfilled"
        ? {
            name: meta[i].name,
            data: r.value,
            weight: meta[i].weight,
            style: "normal" as const,
          }
        : null,
    )
    .filter((f): f is NonNullable<typeof f> => f !== null);

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
              {article.ourScore} - {article.oppScore}
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
              ▼ {article.heroName}・{article.heroStat}
            </div>
          </div>
        </div>

        {/* ── Row of 4 framed photo thumbnails with red caption bars ── */}
        <div style={{ display: "flex", gap: 8, padding: "10px 40px 0 40px" }}>
          {[
            { label: team.shortName, color: team.color, textColor: team.textColor, caption: "本拠地で連勝" },
            { label: article.photos[0].label, color: "#fff", textColor: ink, caption: article.photos[0].caption },
            { label: article.photos[1].label, color: "#fff", textColor: ink, caption: article.photos[1].caption },
            { label: article.photos[2].label, color: "#fff", textColor: ink, caption: article.photos[2].caption },
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
                ▼ 指揮官コメント
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
