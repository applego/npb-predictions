export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

interface CommentatorData {
  user: {
    id: number;
    name: string;
    slug: string;
    role: string;
    source: string | null;
    sourceUrl: string | null;
    avatarUrl: string | null;
  };
  yearsWithData: number[];
  seasons: SeasonData[];
}

interface SeasonData {
  year: number;
  variant: string | null;
  rankingScore: number;
  titleScore: number;
  totalScore: number;
  centralDetails: RankDetail[];
  pacificDetails: RankDetail[];
  titleDetails: TitleDetail[];
}

interface RankDetail {
  rank: number;
  predictedTeam: string;
  actualTeam: string;
  actualRank: number | null;
  score: number;
}

interface TitleDetail {
  league: "central" | "pacific";
  category: string;
  predictedPlayer: string;
  actualPlayer: string | null;
  hit: boolean;
  score: number;
}

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

const TITLE_LABELS: Record<string, string> = {
  batting_avg: "首位打者",
  rbi: "打点王",
  home_runs: "本塁打王",
  wins: "最多勝",
  era: "最優秀防御率",
  saves: "最多セーブ",
};

async function getCommentatorData(
  slug: string,
  year?: string
): Promise<CommentatorData | null> {
  try {
    const url = year
      ? `${API_BASE}/api/commentators/${slug}?year=${year}`
      : `${API_BASE}/api/commentators/${slug}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<CommentatorData>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getCommentatorData(slug, sp.year);
  if (!data) {
    return { title: "Not Found | NPB Predictions League" };
  }
  const yearLabel = sp.year ? `${sp.year}年` : "";
  return {
    title: `${data.user.name} ${yearLabel} | NPB Predictions League`,
    description: `${data.user.name}の${yearLabel}プロ野球順位予想と成績`,
    alternates: { canonical: `/commentators/${slug}` },
  };
}

function fmtScore(score: number) {
  return score > 0 ? `+${score}` : String(score);
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score > 0
      ? "var(--field)"
      : score < 0
        ? "var(--stitch)"
        : "var(--text-muted)";
  return (
    <span
      className="inline-block rounded-sm px-1.5 py-0.5 text-xs font-bold tabular-nums"
      style={{
        fontFamily: "var(--font-display)",
        color,
        background:
          score > 0
            ? "rgba(46,125,50,0.08)"
            : score < 0
              ? "rgba(229,57,53,0.08)"
              : "var(--bg-elevated)",
        border: `1px solid ${score > 0 ? "rgba(46,125,50,0.2)" : score < 0 ? "rgba(229,57,53,0.2)" : "var(--border-primary)"}`,
      }}
    >
      {fmtScore(score)}
    </span>
  );
}

function RankingTable({
  label,
  badgeColor,
  details,
}: {
  label: string;
  badgeColor: string;
  details: RankDetail[];
}) {
  if (details.length === 0) return null;

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
        style={{ border: "1px solid var(--border-primary)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-primary)" }}>
              {["\u9806\u4F4D", "\u4E88\u60F3", "\u5B9F\u969B", "\u7D50\u679C"].map((col, i) => (
                <th
                  key={col}
                  className={`px-3 py-2 text-xs font-medium ${i === 3 ? "text-right" : "text-left"}`}
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                    background: "var(--bg-inset)",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.map((d) => (
              <tr
                key={d.rank}
                style={{ borderBottom: "1px solid var(--border-primary)" }}
              >
                <td
                  className="px-3 py-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text-muted)",
                  }}
                >
                  {d.rank}{"\u4F4D"}
                </td>
                <td
                  className="px-3 py-2 font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {SHORT_NAMES[d.predictedTeam] ?? d.predictedTeam}
                </td>
                <td
                  className="px-3 py-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {d.actualTeam
                    ? SHORT_NAMES[d.actualTeam] ?? d.actualTeam
                    : "\u2014"}
                </td>
                <td className="px-3 py-2 text-right">
                  <ScoreBadge score={d.score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function CommentatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const selectedYear = sp.year ? parseInt(sp.year, 10) : undefined;

  // If year is specified, fetch that year; otherwise fetch all
  const data = await getCommentatorData(slug, sp.year);

  if (!data) {
    return (
      <div className="px-6 py-20 text-center">
        <h1
          className="text-lg font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {"\u89E3\u8AAC\u8005\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"}
        </h1>
        <Link
          href="/rankings/commentators"
          className="mt-4 inline-block text-sm"
          style={{ color: "var(--stitch)" }}
        >
          {"\u2190"} {"\u30E9\u30F3\u30AD\u30F3\u30B0\u306B\u623B\u308B"}
        </Link>
      </div>
    );
  }

  const { user } = data;
  // Get full year list (need separate call without year filter)
  const allData = selectedYear
    ? await getCommentatorData(slug)
    : data;
  const yearsWithData = allData?.yearsWithData ?? data.yearsWithData;

  const seasonData = data.seasons[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/rankings/commentators"
        className="inline-flex items-center gap-1 text-sm font-medium"
        style={{ color: "var(--stitch)" }}
      >
        {"\u2190"} {"\u89E3\u8AAC\u8005\u30E9\u30F3\u30AD\u30F3\u30B0"}
      </Link>

      {/* Header */}
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
        <div className="px-5 py-5 sm:px-8">
          <div className="flex items-start gap-4">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-14 w-14 rounded-full object-cover"
                style={{ border: "2px solid var(--border-primary)" }}
              />
            )}
            <div>
              <h1
                className="text-xl font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                }}
              >
                {user.name}
              </h1>
              {user.source && (
                <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                  {user.sourceUrl ? (
                    <a
                      href={user.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--stitch)" }}
                    >
                      {user.source}
                    </a>
                  ) : (
                    user.source
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Score summary */}
          {seasonData && (
            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {"\u9806\u4F4D\u4E88\u60F3"}
                </span>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color:
                      seasonData.rankingScore > 0
                        ? "var(--field)"
                        : seasonData.rankingScore < 0
                          ? "var(--stitch)"
                          : "var(--text-muted)",
                  }}
                >
                  {fmtScore(seasonData.rankingScore)}pt
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {"\u30BF\u30A4\u30C8\u30EB\u4E88\u60F3"}
                </span>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color:
                      seasonData.titleScore > 0
                        ? "var(--field)"
                        : "var(--text-muted)",
                  }}
                >
                  {fmtScore(seasonData.titleScore)}pt
                </p>
              </div>
              <div
                className="h-10 w-px"
                style={{ background: "var(--border-primary)" }}
              />
              <div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {"\u5408\u8A08"}
                </span>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color:
                      seasonData.totalScore > 0
                        ? "var(--dirt)"
                        : seasonData.totalScore < 0
                          ? "var(--stitch)"
                          : "var(--text-muted)",
                  }}
                >
                  {fmtScore(seasonData.totalScore)}pt
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Year tabs */}
      {yearsWithData.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {yearsWithData.map((y) => {
            const isActive = selectedYear
              ? y === selectedYear
              : y === yearsWithData[0];
            return (
              <Link
                key={y}
                href={`/commentators/${slug}?year=${y}`}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: isActive ? "var(--stitch)" : "var(--bg-elevated)",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  border: isActive
                    ? "1px solid var(--stitch)"
                    : "1px solid var(--border-primary)",
                }}
              >
                {y}
              </Link>
            );
          })}
        </div>
      )}

      {/* Prediction tables */}
      {seasonData ? (
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
              {"\u{1F52E}"}
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {selectedYear ?? yearsWithData[0]}{"\u5E74"} {"\u9806\u4F4D\u4E88\u60F3"}
              {seasonData.variant && (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-primary)",
                    color: "var(--text-muted)",
                  }}
                >
                  {seasonData.variant}
                </span>
              )}
            </span>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <RankingTable
              label={"\u30BB"}
              badgeColor="var(--central, #1E40AF)"
              details={seasonData.centralDetails}
            />
            <RankingTable
              label={"\u30D1"}
              badgeColor="var(--pacific, #B91C1C)"
              details={seasonData.pacificDetails}
            />
          </div>
        </section>
      ) : (
        <div
          className="rounded-xl px-6 py-10 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <p style={{ color: "var(--text-muted)" }}>
            {"\u3053\u306E\u5E74\u5EA6\u306E\u4E88\u60F3\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093"}
          </p>
        </div>
      )}

      {/* Title predictions */}
      {seasonData && seasonData.titleDetails.length > 0 && (
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
              {"\u{1F3C6}"}
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {"\u30BF\u30A4\u30C8\u30EB\u4E88\u60F3"}
            </span>
          </div>
          <div
            className="overflow-x-auto"
            style={{ borderTop: "1px solid var(--border-primary)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-primary)" }}>
                  {["\u30EA\u30FC\u30B0", "\u30BF\u30A4\u30C8\u30EB", "\u4E88\u60F3", "\u5B9F\u969B", "\u7D50\u679C"].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={`px-3 py-2 text-xs font-medium ${i === 4 ? "text-right" : "text-left"}`}
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
                {seasonData.titleDetails.map((d, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--border-primary)",
                    }}
                  >
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-1 py-0.5 text-[10px] font-bold"
                        style={{
                          background:
                            d.league === "central"
                              ? "var(--central, #1E40AF)"
                              : "var(--pacific, #B91C1C)",
                          color: "#fff",
                        }}
                      >
                        {d.league === "central" ? "\u30BB" : "\u30D1"}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {TITLE_LABELS[d.category] ?? d.category}
                    </td>
                    <td
                      className="px-3 py-2 font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {d.predictedPlayer}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {d.actualPlayer ?? "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {d.hit ? (
                        <span
                          className="inline-block rounded-sm px-1.5 py-0.5 text-xs font-bold"
                          style={{
                            background: "rgba(46,125,50,0.08)",
                            color: "var(--field)",
                            border: "1px solid rgba(46,125,50,0.2)",
                          }}
                        >
                          +3
                        </span>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {d.actualPlayer ? "0" : "\u2014"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
