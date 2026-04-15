export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "2026 LIVE SCOREBOARD | NPB Predictions League",
  description:
    "2026年シーズンのリアルタイムスコアボード。実績順位が更新されるとスコアが自動計算されます。",
  alternates: { canonical: "/rankings/live" },
};

const API_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

const CURRENT_YEAR = 2026;

interface ScoreEntry {
  userId: number;
  userName: string;
  rankingScore: number;
  titleScore: number;
  totalScore: number;
}

interface ScoreboardResponse {
  season: { id: number; year: number };
  scores: ScoreEntry[];
}

async function getCurrentScoreboard(): Promise<ScoreboardResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/seasons/${CURRENT_YEAR}/current-scoreboard`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json() as Promise<ScoreboardResponse>;
  } catch {
    return null;
  }
}

function fmtScore(score: number) {
  return score > 0 ? `+${score}` : String(score);
}

function getRankDisplay(index: number) {
  if (index === 0) return "\u{1F947}";
  if (index === 1) return "\u{1F948}";
  if (index === 2) return "\u{1F949}";
  return `${index + 1}`;
}

export default async function LivePage() {
  const data = await getCurrentScoreboard();
  const hasScores = data && data.scores.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            letterSpacing: "0.04em",
            color: "var(--text-primary)",
          }}
        >
          <span style={{ fontSize: "0.85em" }}>{"\u{1F4C8}"}</span>{" "}
          <span style={{ color: "var(--stitch)" }}>{CURRENT_YEAR}</span> LIVE
          SCOREBOARD
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          {hasScores
            ? `${data.scores.length}\u4EBA\u306E\u30B9\u30B3\u30A2\u3092\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u8A08\u7B97\u4E2D`
            : "\u30B7\u30FC\u30BA\u30F3\u9032\u884C\u4E2D \u2014 \u5B9F\u7E3E\u30C7\u30FC\u30BF\u5F85\u3061"}
        </p>
      </div>

      {hasScores ? (
        <>
          {/* Live scoreboard table */}
          <div
            className="overflow-x-auto rounded-xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{ borderBottom: "2px solid var(--border-primary)" }}
                >
                  {["#", "\u4E88\u60F3\u5BB6", "\u9806\u4F4D\u70B9", "\u5408\u8A08"].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={`px-3 py-2.5 text-xs font-medium ${i >= 2 ? "text-right" : "text-left"}`}
                        style={{
                          fontFamily: "var(--font-display)",
                          color: "var(--text-muted)",
                          letterSpacing: "0.1em",
                          background: "var(--bg-inset)",
                        }}
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.scores.map((entry, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <tr
                      key={entry.userId}
                      style={{
                        borderBottom: "1px solid var(--border-primary)",
                        background: isTop3
                          ? "rgba(212,160,23,0.03)"
                          : "transparent",
                      }}
                    >
                      <td
                        className="px-3 py-2.5"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: isTop3
                            ? "var(--dirt)"
                            : "var(--text-muted)",
                        }}
                      >
                        {getRankDisplay(idx)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {entry.userName}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2.5 text-right"
                        style={{
                          fontFamily: "var(--font-display)",
                          color:
                            entry.rankingScore > 0
                              ? "var(--field)"
                              : entry.rankingScore < 0
                                ? "var(--stitch)"
                                : "var(--text-muted)",
                        }}
                      >
                        {fmtScore(entry.rankingScore)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className="inline-block rounded-sm px-2 py-0.5"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            background: isTop3
                              ? "rgba(212,160,23,0.08)"
                              : "var(--bg-elevated)",
                            color:
                              entry.totalScore > 0
                                ? "var(--dirt)"
                                : entry.totalScore < 0
                                  ? "var(--stitch)"
                                  : "var(--text-muted)",
                            border: `1px solid ${isTop3 ? "rgba(212,160,23,0.2)" : "var(--border-primary)"}`,
                          }}
                        >
                          {fmtScore(entry.totalScore)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/rankings/predictions"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              {"\u{1F52E}"} {"\u4E88\u60F3\u3092\u78BA\u8A8D\u3059\u308B"} {"\u2192"}
            </Link>
            <Link
              href="/rankings/scoreboard"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              {"\u{1F3C6}"} {"\u904E\u53BB\u306E\u7D50\u679C\u3092\u898B\u308B"} {"\u2192"}
            </Link>
          </div>
        </>
      ) : (
        /* Placeholder state */
        <section
          className="overflow-hidden rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          {/* Stitch accent */}
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, var(--stitch), var(--stitch-light) 50%, transparent 100%)",
            }}
          />

          <div className="px-6 py-10 text-center sm:px-10">
            {/* Your score card placeholder */}
            <div
              className="mx-auto mb-6 max-w-sm overflow-hidden rounded-lg"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <div
                className="px-4 py-2 text-left text-xs font-bold"
                style={{
                  borderBottom: "1px solid var(--border-primary)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.1em",
                }}
              >
                {"\u{1F4C8}"} YOUR SCORE
              </div>
              <div className="px-4 py-4">
                <div className="flex items-baseline justify-between">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {"\u4E88\u60F3\u30B9\u30B3\u30A2"}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.5rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    ---
                  </span>
                </div>
                <div
                  className="mt-2 flex items-baseline justify-between"
                  style={{
                    borderTop: "1px solid var(--border-primary)",
                    paddingTop: "8px",
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {"\u30B0\u30EB\u30FC\u30D7\u5185\u9806\u4F4D"}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    --- / ---
                  </span>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <span
              className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full text-xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-primary)",
              }}
            >
              {"\u{1F4CA}"}
            </span>
            <h2
              className="mt-3 text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {"\u5B9F\u7E3E\u30C7\u30FC\u30BF\u5F85\u3061"}
            </h2>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {"\u5B9F\u7E3E\u9806\u4F4D\u304C\u66F4\u65B0\u3055\u308C\u308B\u3068"}
              <br />
              {"\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u30B9\u30B3\u30A2\u304C\u8A08\u7B97\u3055\u308C\u307E\u3059"}
            </p>
            <div className="mt-6">
              <Link
                href="/rankings/predictions"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all"
                style={{
                  background: "var(--stitch)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(229,57,53,0.3)",
                }}
              >
                {"\u4E88\u60F3\u3092\u78BA\u8A8D\u3059\u308B"} {"\u2192"}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
