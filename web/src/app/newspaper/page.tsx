export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { NPB_TEAMS } from "@/lib/teams";

const API_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

export const metadata: Metadata = {
  title: "NPB予想新聞 — 順位予想リーグ 紙面",
  description:
    "順位予想リーグの現在順位を、縦書きの新聞紙面で。首位の予想者と合計点を一面でお届けします。",
};

// ── number / date helpers (kanji typesetting) ──────────────────────────
const KANJI = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const FW = ["０", "１", "２", "３", "４", "５", "６", "７", "８", "９"];

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

function digitsToFullwidth(n: number): string {
  return String(n)
    .split("")
    .map((d) => FW[Number(d)])
    .join("");
}

function editionDate(): string {
  // Approximate JST (UTC+9) without pulling in a tz library on the edge.
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  const wd = ["日", "月", "火", "水", "木", "金", "土"][now.getUTCDay()];
  const reiwa = y - 2018; // 令和元年 = 2019
  const reiwaStr = reiwa === 1 ? "元" : numToKanji(reiwa);
  return `${digitsToKanji(y)}年（令和${reiwaStr}年）${numToKanji(m)}月${numToKanji(d)}日　${wd}曜日`;
}

// ── data ────────────────────────────────────────────────────────────────
interface ScoreRow {
  userName: string;
  userRole: string;
  rankingScore: number;
  titleScore: number;
  totalScore: number;
}

interface StandRow {
  name: string;
  rankScore: number;
  titleScore: number;
  total: number;
}

async function getActiveYear(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons`, { cache: "no-store" });
    if (!res.ok) return new Date().getFullYear();
    const seasons = (await res.json()) as { year: number; isActive?: boolean }[];
    const active = seasons.find((s) => s.isActive) ?? seasons[0];
    return active?.year ?? new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
}

async function getStandings(year: number): Promise<StandRow[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/seasons/${year}/current-scoreboard`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { scores?: ScoreRow[] };
    const friends = (data.scores ?? []).filter((s) => s.userRole === "friend");
    const pool = friends.length > 0 ? friends : (data.scores ?? []);
    return pool.slice(0, 5).map((s) => ({
      name: s.userName,
      rankScore: s.rankingScore,
      titleScore: s.titleScore,
      total: s.totalScore,
    }));
  } catch {
    return [];
  }
}

// ── theme (cream newsprint, Mincho) ──────────────────────────────────────
const INK = "#1a1712";
const RULE = "#b8af98";
const MUTE = "#3a352a";
const MONO = "#5b5443";

export default async function NewspaperPage() {
  const year = await getActiveYear();
  const live = await getStandings(year);
  const rows = live;

  const leader = rows[0];
  const second = rows[1];
  const gap = leader && second ? leader.total - second.total : 0;
  const leadWord = gap >= 8 ? "独走" : gap >= 3 ? "快走" : "首位攻防";

  const headlineMain = leader ? `${leader.name}　${leadWord}` : "順位予想リーグ";
  const headlineSub = leader
    ? `合計${numToKanji(leader.total)}点で首位`
    : "開幕前予想を採点";

  const leadSentence = leader
    ? `友人らで競う順位予想リーグの${digitsToKanji(year)}年シーズン。各人が開幕前に提出したセ・パ両リーグの順位予想を採点した結果、${leader.name}が合計${numToKanji(leader.total)}点をマークし、首位に立っている。`
    : `${digitsToKanji(year)}年シーズンの順位予想リーグ。各人の開幕前予想を採点中。`;
  const bodyTail =
    second && gap > 0
      ? `二位の${second.name}とは${numToKanji(gap)}点差で、残るタイトル次第では逆転の目も残る。各人の予想と現在のスコアは、専用サイトの順位表で確認できる。`
      : `上位は混戦模様。各人の予想と現在のスコアは、専用サイトの順位表で確認できる。`;

  return (
    <>
      <div className="newspaper-preview-shell">
        {/* Mincho fonts for this page only — React hoists stylesheet links. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;700;800&family=Shippori+Mincho:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />

        <div className="newspaper-preview-frame">
          <div className="newspaper-preview-sheet">
            {/* ── 題字 ── */}
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                justifyContent: "space-between",
                borderBottom: `1px solid ${INK}`,
                paddingBottom: 10,
              }}
            >
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <div
                style={{
                  fontFamily: "'Shippori Mincho B1', serif",
                  fontWeight: 800,
                  fontSize: 42,
                  letterSpacing: "0.08em",
                  lineHeight: 1,
                }}
              >
                ＮＰＢ予想新聞
              </div>
              <div
                style={{
                  fontFamily: "'Spline Sans Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: MONO,
                }}
              >
                NPB PREDICTIONS PRESS
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                textAlign: "right",
                fontSize: 12,
                lineHeight: 1.7,
                color: MUTE,
              }}
            >
              <div>{editionDate()}</div>
              <div
                style={{
                  fontFamily: "'Spline Sans Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "#6a6353",
                }}
              >
                第{digitsToKanji(year)}号 ／ スポーツ面
              </div>
            </div>
          </div>
          <div
            style={{
              height: 3,
              borderBottom: `1px solid ${INK}`,
              marginBottom: 18,
            }}
          />

          {/* ── 本文バンド（右→左） ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "row-reverse",
              alignItems: "stretch",
              gap: 0,
              height: 884,
            }}
          >
            {/* 1) 主見出し（最右） */}
            <div
              style={{
                flex: "none",
                display: "flex",
                flexDirection: "row-reverse",
                alignItems: "flex-start",
                paddingLeft: 12,
                borderLeft: `1px solid ${RULE}`,
              }}
            >
              <div
                className="vrl"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: INK,
                  marginLeft: 4,
                  paddingTop: 4,
                }}
              >
                順位予想リーグ　最終盤
              </div>
              <div
                className="vrl"
                style={{
                  fontFamily: "'Shippori Mincho B1', serif",
                  fontWeight: 800,
                  fontSize: 46,
                  letterSpacing: "0.03em",
                  lineHeight: 1.16,
                }}
              >
                {leader ? (
                  <>
                    {leader.name}　<span className="kenten">{leadWord}</span>
                  </>
                ) : (
                  "順位予想リーグ"
                )}
              </div>
              <div
                className="vrl"
                style={{
                  fontFamily: "'Shippori Mincho B1', serif",
                  fontWeight: 800,
                  fontSize: 46,
                  letterSpacing: "0.03em",
                  lineHeight: 1.16,
                  color: INK,
                }}
              >
                {headlineSub}
              </div>
            </div>

            {/* 2) 脇見出し + 反転ラベル */}
            <div
              style={{
                flex: "none",
                display: "flex",
                flexDirection: "row-reverse",
                alignItems: "flex-start",
                padding: "0 11px",
                borderLeft: `1px solid ${RULE}`,
              }}
            >
              <div
                className="vrl"
                style={{
                  fontFamily: "'Shippori Mincho B1', serif",
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: "0.05em",
                  lineHeight: 1.45,
                }}
              >
                {headlineMain}　逃げ切りへ視界良好
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 9,
                  marginRight: 9,
                  paddingTop: 2,
                }}
              >
                <div
                  className="vrl"
                  style={{
                    background: INK,
                    color: "#ece7da",
                    fontFamily: "'Shippori Mincho B1', serif",
                    fontWeight: 800,
                    fontSize: 17,
                    letterSpacing: "0.08em",
                    padding: "8px 5px",
                  }}
                >
                  首位
                </div>
                <div
                  className="vrl"
                  style={{
                    fontFamily: "'Shippori Mincho', serif",
                    fontWeight: 700,
                    fontSize: 15,
                    lineHeight: 1.55,
                  }}
                >
                  「{leader ? leader.name : "—"}　首位」
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 9,
                  marginRight: 10,
                  paddingTop: 140,
                }}
              >
                <div
                  className="vrl"
                  style={{
                    background: "transparent",
                    color: INK,
                    border: `1.5px solid ${INK}`,
                    fontFamily: "'Shippori Mincho B1', serif",
                    fontWeight: 800,
                    fontSize: 17,
                    letterSpacing: "0.08em",
                    padding: "7px 4px",
                  }}
                >
                  混戦
                </div>
                <div
                  className="vrl"
                  style={{
                    fontFamily: "'Shippori Mincho', serif",
                    fontWeight: 700,
                    fontSize: 15,
                    lineHeight: 1.55,
                  }}
                >
                  {second && gap > 0
                    ? `「${second.name}　追う」`
                    : "「終盤へ 警戒も」"}
                </div>
              </div>
            </div>

            {/* 3) 写真 + キャプション */}
            <div
              style={{
                flex: "none",
                display: "flex",
                flexDirection: "row-reverse",
                padding: "0 11px",
                borderLeft: `1px solid ${RULE}`,
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", width: 150 }}
              >
                <div
                  style={{
                    height: 148,
                    background:
                      "repeating-linear-gradient(135deg,#cfc8b6 0 7px,#c4bca7 7px 14px)",
                    border: "1px solid #9b927c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Spline Sans Mono', monospace",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "#6a6353",
                    }}
                  >
                    PHOTO
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "row-reverse",
                    borderTop: `1px solid ${RULE}`,
                    marginTop: 8,
                    paddingTop: 8,
                  }}
                >
                  <div
                    className="vrl"
                    style={{
                      fontFamily: "'Shippori Mincho', serif",
                      fontSize: 11.5,
                      lineHeight: 1.8,
                      color: MUTE,
                    }}
                  >
                    写真＝開幕前、各人が今季の順位とタイトルの予想を持ち寄った（本紙作成のイメージ）
                  </div>
                </div>
              </div>
            </div>

            {/* 4) 本文（リード込み） */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                padding: "0 11px",
                borderLeft: `1px solid ${RULE}`,
              }}
            >
              <div
                className="vrl"
                style={{
                  fontFamily: "'Shippori Mincho', serif",
                  fontSize: 14.5,
                  lineHeight: 2.0,
                  letterSpacing: "0.01em",
                  textAlign: "justify",
                  height: 884,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 16 }}>
                  {leadSentence}
                </span>
                {bodyTail}
              </div>
            </div>

            {/* 5) 順位表（最左・横組インセット） */}
            <div
              style={{
                flex: "none",
                width: 196,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}
            >
              <div style={{ border: `1.5px solid ${INK}`, background: "#f3efe5" }}>
                <div
                  style={{
                    background: INK,
                    color: "#ece7da",
                    fontFamily: "'Shippori Mincho B1', serif",
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "0.08em",
                    textAlign: "center",
                    padding: "7px 0",
                  }}
                >
                  順位予想リーグ 現在順位
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr 0.9fr 0.9fr 1fr",
                    fontFamily: "'Spline Sans Mono', monospace",
                    fontSize: 10,
                    color: MONO,
                    borderBottom: `1px solid ${INK}`,
                  }}
                >
                  <div style={{ padding: "5px 4px" }}>予想者</div>
                  <div style={{ padding: "5px 2px", textAlign: "right" }}>順位</div>
                  <div style={{ padding: "5px 2px", textAlign: "right" }}>冠</div>
                  <div style={{ padding: "5px 2px", textAlign: "right" }}>合計</div>
                  <div style={{ padding: "5px 4px", textAlign: "center" }}>位</div>
                </div>
                {rows.map((r, i) => (
                  <div
                    key={`${r.name}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr 0.9fr 0.9fr 1fr",
                      alignItems: "center",
                      borderBottom:
                        i === rows.length - 1 ? "none" : "1px solid #d3cab4",
                      background: i === 0 ? "rgba(0,0,0,0.05)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        padding: "7px 4px",
                        fontFamily: "'Shippori Mincho', serif",
                        fontWeight: i === 0 ? 700 : 400,
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.name}
                    </div>
                    <div
                      style={{
                        padding: "7px 2px",
                        textAlign: "right",
                        fontFamily: "'Spline Sans Mono', monospace",
                        fontSize: 13,
                      }}
                    >
                      {r.rankScore}
                    </div>
                    <div
                      style={{
                        padding: "7px 2px",
                        textAlign: "right",
                        fontFamily: "'Spline Sans Mono', monospace",
                        fontSize: 13,
                      }}
                    >
                      {r.titleScore}
                    </div>
                    <div
                      style={{
                        padding: "7px 2px",
                        textAlign: "right",
                        fontFamily: "'Spline Sans Mono', monospace",
                        fontWeight: i === 0 ? 700 : 400,
                        fontSize: 15,
                        color: INK,
                      }}
                    >
                      {r.total}
                    </div>
                    <div
                      style={{
                        padding: "7px 4px",
                        textAlign: "center",
                        fontFamily: "'Shippori Mincho B1', serif",
                        fontWeight: i === 0 ? 700 : 400,
                      }}
                    >
                      {digitsToFullwidth(i + 1)}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 10,
                  border: `1px solid ${RULE}`,
                  padding: "9px 10px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Shippori Mincho B1', serif",
                    fontWeight: 700,
                    fontSize: 13,
                    borderBottom: `1px solid ${RULE}`,
                    paddingBottom: 5,
                    marginBottom: 6,
                  }}
                >
                  スコアの内訳
                </div>
                <div
                  style={{
                    fontFamily: "'Shippori Mincho', serif",
                    fontSize: 12.5,
                    lineHeight: 1.95,
                    color: "#2a261d",
                  }}
                >
                  順位的中　＝　順位スコア
                  <br />
                  タイトル的中　＝　冠スコア
                  <br />
                  合計　＝　現在の総得点
                </div>
              </div>
            </div>
          </div>

          {/* ── フッタ ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${INK}`,
              marginTop: 16,
              paddingTop: 9,
              fontFamily: "'Spline Sans Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#6a6353",
            }}
          >
            <span>〔スポーツ・{digitsToFullwidth(year % 100)}〕</span>
            <span>
              {rows.length === 0
                ? "ライブスコア準備中です ／ "
                : "見出し・本文はライブスコアから自動生成です ／ "}
              順位推移は
              <span className="newspaper-scaled-label" style={{ color: "#6a6353" }}>
                順位表
              </span>
              <Link
                href="/rankings/scoreboard"
                className="newspaper-unscaled-link"
                style={{ color: "#6a6353", textDecoration: "underline" }}
              >
                順位表
              </Link>
              で確認できます
            </span>
            <span>ＮＰＢ予想新聞社</span>
          </div>
          </div>
        </div>
        <Link
          href="/rankings/scoreboard"
          className="mt-3 inline-flex min-h-11 items-center rounded-sm px-4 text-sm font-semibold"
          style={{
            background: "var(--field)",
            color: "#fff",
            letterSpacing: "0.04em",
          }}
        >
          順位表を開く
        </Link>
      </div>

      {/* ── 球団別 一面（自動生成画像）— 既存機能を保持 ── */}
      <TeamGallery />
    </>
  );
}

function TeamGallery() {
  const central = NPB_TEAMS.filter((t) => t.league === "central");
  const pacific = NPB_TEAMS.filter((t) => t.league === "pacific");
  return (
    <section style={{ marginTop: 40 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
          letterSpacing: "0.04em",
          color: "var(--text-primary)",
        }}
      >
        球団別 一面（自動生成）
      </h2>
      <p style={{ color: "var(--text-muted)", margin: "4px 0 20px", fontSize: 13 }}>
        実際の予想・順位データから球団別の新聞一面を自動生成
      </p>
      <TeamRow title="セントラル・リーグ" teams={central} />
      <TeamRow title="パシフィック・リーグ" teams={pacific} />
    </section>
  );
}

function TeamRow({
  title,
  teams,
}: {
  title: string;
  teams: typeof NPB_TEAMS;
}) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 14,
          letterSpacing: "0.06em",
          color: "var(--text-secondary)",
          borderBottom: "1px solid var(--border-primary)",
          paddingBottom: 8,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        {teams.map((team) => (
          <a
            key={team.slug}
            href={`/api/newspaper/${team.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              borderRadius: 8,
              overflow: "hidden",
              border: `3px solid ${team.color}`,
              background: "#fff",
            }}
          >
            <div
              style={{
                aspectRatio: "1080 / 1920",
                background:
                  "linear-gradient(rgba(255,255,255,0.82), rgba(255,255,255,0.82)), repeating-linear-gradient(0deg, #f7f1df 0 3px, #efe6cf 3px 4px)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: team.color,
                  color: team.textColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {team.abbr}
              </div>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                生成画像を開く
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 11,
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                クリックで{team.name}版の
                <br />
                新聞一面を生成
              </div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                background: team.color,
                color: team.textColor,
                fontSize: 14,
                fontWeight: 700,
                textAlign: "center",
                letterSpacing: "0.05em",
              }}
            >
              {team.name}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
