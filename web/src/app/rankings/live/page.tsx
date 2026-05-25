export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd, SportsEventJsonLd } from "@/components/StructuredData";
import {
  canonicalAlternates,
  clampDescription,
  ogImageUrl,
  socialPreview,
  SEO_TERMS,
} from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: "2026 LIVE SCOREBOARD",
  description: clampDescription(
    `2026年${SEO_TERMS.npbFull}シーズンのリアルタイムスコアボード。${SEO_TERMS.bothLeagues}の実績順位が更新されると、予想家のスコアが自動で再計算されます。`,
  ),
  keywords: [
    SEO_TERMS.site,
    "2026 スコアボード",
    `${SEO_TERMS.npbShort} リアルタイム 順位`,
    "予想 的中 速報",
  ],
  alternates: canonicalAlternates("/rankings/live"),
  ...socialPreview({
    title: "2026 LIVE SCOREBOARD | NPB予想リーグ",
    description: "2026年シーズンのリアルタイム予想スコア。実績順位が更新されると自動計算。",
    pathname: "/rankings/live",
    ogImage: ogImageUrl("season", { year: 2026 }),
  }),
};

const API_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

const CURRENT_YEAR = 2026;

interface ScoreEntry {
  userId: number;
  userName: string;
  userRole?: string;
  userSource?: string | null;
  rankingScore: number;
  titleScore: number;
  totalScore: number;
}

interface StandingEntry {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
}

interface RankChange {
  league: "central" | "pacific";
  teamName: string;
  previousRank: number;
  currentRank: number;
  change: number;
}

interface ScoreboardResponse {
  season: { id: number; year: number };
  scores: ScoreEntry[];
  standings: StandingEntry[];
  changes: RankChange[];
}

const TEAM_COLORS: Record<string, { bg: string; text: string }> = {
  "読売ジャイアンツ": { bg: "#F97316", text: "#fff" },
  "阪神タイガース": { bg: "#FBBF24", text: "#1a1a1a" },
  "横浜DeNAベイスターズ": { bg: "#2563EB", text: "#fff" },
  "広島東洋カープ": { bg: "#DC2626", text: "#fff" },
  "中日ドラゴンズ": { bg: "#1E40AF", text: "#fff" },
  "東京ヤクルトスワローズ": { bg: "#059669", text: "#fff" },
  "オリックス・バファローズ": { bg: "#1E3A5F", text: "#C8A951" },
  "福岡ソフトバンクホークス": { bg: "#F5D100", text: "#1a1a1a" },
  "千葉ロッテマリーンズ": { bg: "#1a1a1a", text: "#fff" },
  "東北楽天ゴールデンイーグルス": { bg: "#B91C1C", text: "#fff" },
  "埼玉西武ライオンズ": { bg: "#1D4ED8", text: "#fff" },
  "北海道日本ハムファイターズ": { bg: "#1E3A5F", text: "#4FB3E0" },
};

const SHORT_NAMES: Record<string, string> = {
  "読売ジャイアンツ": "巨人",
  "阪神タイガース": "阪神",
  "横浜DeNAベイスターズ": "DeNA",
  "広島東洋カープ": "広島",
  "中日ドラゴンズ": "中日",
  "東京ヤクルトスワローズ": "ヤクルト",
  "オリックス・バファローズ": "オリックス",
  "福岡ソフトバンクホークス": "ソフトバンク",
  "千葉ロッテマリーンズ": "ロッテ",
  "東北楽天ゴールデンイーグルス": "楽天",
  "埼玉西武ライオンズ": "西武",
  "北海道日本ハムファイターズ": "日本ハム",
};

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

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold" style={{ color: "var(--field)" }}>
        {"\u25B2"}{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold" style={{ color: "var(--stitch)" }}>
        {"\u25BC"}{Math.abs(change)}
      </span>
    );
  }
  return (
    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
      {"\u2014"}
    </span>
  );
}

function StandingsTable({
  league,
  label,
  badgeColor,
  standings,
  changes,
}: {
  league: "central" | "pacific";
  label: string;
  badgeColor: string;
  standings: StandingEntry[];
  changes: RankChange[];
}) {
  const leagueStandings = standings
    .filter((s) => s.league === league)
    .sort((a, b) => a.rank - b.rank);

  if (leagueStandings.length === 0) return null;

  const changeMap = new Map(
    changes.filter((c) => c.league === league).map((c) => [c.teamName, c.change]),
  );

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-black"
          style={{ background: badgeColor, color: "#fff" }}
        >
          {label}
        </span>
      </div>
      <div
        className="overflow-hidden rounded-lg"
        style={{
          border: "1px solid var(--border-primary)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-primary)" }}>
              {["#", "\u30C1\u30FC\u30E0", "\u52DD", "\u6557", "\u5206", "\u5909\u52D5"].map(
                (col, i) => (
                  <th
                    key={col}
                    className={`px-3 py-2 text-xs font-medium ${i === 0 ? "w-8 text-center" : i === 1 ? "text-left" : "text-center"}`}
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
            {leagueStandings.map((entry) => {
              const teamColor = TEAM_COLORS[entry.teamName];
              const shortName = SHORT_NAMES[entry.teamName] ?? entry.teamName;
              const change = changeMap.get(entry.teamName) ?? 0;
              return (
                <tr
                  key={entry.teamName}
                  style={{ borderBottom: "1px solid var(--border-primary)" }}
                >
                  <td
                    className="w-8 px-3 py-2 text-center"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {entry.rank}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {teamColor && (
                        <span
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{ background: teamColor.bg }}
                        />
                      )}
                      <span
                        className="font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {shortName}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-3 py-2 text-center tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {entry.wins}
                  </td>
                  <td
                    className="px-3 py-2 text-center tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {entry.losses}
                  </td>
                  <td
                    className="px-3 py-2 text-center tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {entry.draws}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ChangeIndicator change={change} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function LivePage() {
  const data = await getCurrentScoreboard();
  const hasScores = data && data.scores.length > 0;
  const hasStandings = data && data.standings && data.standings.length > 0;

  const breadcrumbItems = [
    { label: "ランキング", href: "/rankings/predictions" },
    { label: `${CURRENT_YEAR} LIVE` },
  ];

  return (
    <div className="space-y-5">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <SportsEventJsonLd
        year={CURRENT_YEAR}
        league="both"
        pathname="/rankings/live"
        description={`${CURRENT_YEAR}年${SEO_TERMS.npbFull}のリアルタイム予想スコア`}
      />
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
                        {entry.userSource && (
                          <span
                            className="ml-2 text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            （{entry.userSource}）
                          </span>
                        )}
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

          {/* Standings tables */}
          {hasStandings && (
            <section
              className="overflow-hidden rounded-xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <div
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: "1px solid var(--border-primary)" }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded text-xs"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-primary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {"\u{26BE}"}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {CURRENT_YEAR} {"\u5B9F\u7E3E\u9806\u4F4D"}
                </span>
              </div>
              <div className="grid gap-5 p-5 md:grid-cols-2">
                <StandingsTable
                  league="central"
                  label={"\u30BB"}
                  badgeColor="var(--central, #1E40AF)"
                  standings={data.standings}
                  changes={data.changes}
                />
                <StandingsTable
                  league="pacific"
                  label={"\u30D1"}
                  badgeColor="var(--pacific, #B91C1C)"
                  standings={data.standings}
                  changes={data.changes}
                />
              </div>
            </section>
          )}

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
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, var(--stitch), var(--stitch-light) 50%, transparent 100%)",
            }}
          />
          <div className="px-6 py-10 text-center sm:px-10">
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
