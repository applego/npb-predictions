export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { Season, Prediction } from "@/lib/types";
import { getTeamByName } from "@/lib/teams";
import { NewsCompact } from "./news/NewsClient";

export const metadata: Metadata = {
  title: "NPB予想リーグ | プロ野球順位予想",
  description:
    "プロ野球順位予想を競う情報ボード。セ・パ両リーグの1位予想分布、解説者ランキング、最新ニュースをチェックできます。",
  openGraph: {
    title: "NPB予想リーグ | プロ野球順位予想",
    description:
      "放送席のように、プロ野球順位予想と的中状況を見渡せる情報ボード。",
    type: "website",
  },
  alternates: { canonical: "/" },
};

const API_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

// ── Data fetchers ──

async function getSeasons(): Promise<Season[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return res.json() as Promise<Season[]>;
  } catch {
    return [];
  }
}

interface NewsItem {
  id: string;
  type: "hit" | "ranking" | "prediction" | "spotlight";
  title: string;
  body: string;
  commentator?: string;
  year?: number;
  timestamp: number;
  icon: string;
  source?: string;
}

async function getLatestNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/news?limit=5`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return res.json() as Promise<NewsItem[]>;
  } catch {
    return [];
  }
}

async function getPredictions(year: number): Promise<Prediction[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons/${year}/predictions`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return res.json() as Promise<Prediction[]>;
  } catch {
    return [];
  }
}

interface CommentatorRankingResponse {
  totalCommentators: number;
  commentators: { rank: number; name: string; effectiveTotal: number }[];
}

async function getTopCommentators(
  year: number
): Promise<CommentatorRankingResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/rankings/commentators?year=${year}&league=all`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    return res.json() as Promise<CommentatorRankingResponse>;
  } catch {
    return null;
  }
}

// ── Distribution computation ──

interface TeamCount {
  teamName: string;
  displayName: string;
  count: number;
  pct: number;
  color: string;
}

function computeFirstPlaceDistribution(
  predictions: Prediction[],
  league: "central" | "pacific"
): TeamCount[] {
  const counts: Record<string, number> = {};
  for (const pred of predictions) {
    const firstPick = pred.rankingPicks.find(
      (rp) => rp.league === league && rp.rank === 1
    );
    if (firstPick) {
      counts[firstPick.teamName] = (counts[firstPick.teamName] ?? 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  // Sort descending by count
  const sorted = Object.entries(counts)
    .map(([teamName, count]) => {
      const team = getTeamByName(teamName);
      return {
        teamName,
        displayName: team?.shortName ?? teamName,
        count,
        pct: Math.round((count / total) * 100),
        color: team?.color ?? "var(--stitch)",
      };
    })
    .sort((a, b) => b.count - a.count);

  return sorted;
}

// ── Score rules ──

const SCORE_CHIPS = [
  { label: "的中", score: "+5", positive: true },
  { label: "1差", score: "+3", positive: true },
  { label: "2差", score: "+1", positive: true },
  { label: "3差", score: "-1", positive: false },
  { label: "4差", score: "-3", positive: false },
  { label: "5差", score: "-5", positive: false },
];

// ── Constants ──

const BEST_SCORE = 44;
const PERFECT_SCORE = 60;

// ── Page ──

export default async function HomePage() {
  const [seasons, latestNews] = await Promise.all([
    getSeasons(),
    getLatestNews(),
  ]);
  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const year = activeSeason?.year ?? new Date().getFullYear();
  const [predictions, commentatorData] = await Promise.all([
    getPredictions(year),
    getTopCommentators(year),
  ]);

  const centralDist = computeFirstPlaceDistribution(predictions, "central");
  const pacificDist = computeFirstPlaceDistribution(predictions, "pacific");
  const topScorer = commentatorData?.commentators?.[0] ?? null;

  return (
    <div className="space-y-6">
      {/* ══════════ HERO: BROADCAST BOARD ══════════ */}
      <section
        className="relative overflow-hidden rounded-lg"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-primary)",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            background: "var(--field)",
            color: "#fff",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            NPB 予想リーグ
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.16em",
            }}
          >
            {year} シーズン
          </span>
        </div>

        {/* Subtle diamond watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 select-none"
          style={{
            fontSize: "8rem",
            lineHeight: 1,
            color: "var(--border-primary)",
            opacity: 0.4,
          }}
        >
          &#9671;
        </div>

        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          {/* Trophy icon + badge */}
          <div className="mb-4 flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
              style={{
                background: "var(--field)",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(31,122,63,0.22)",
              }}
            >
              &#127942;
            </span>
            {activeSeason && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-secondary)",
                  fontFamily:
                    "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  letterSpacing: "0.12em",
                }}
              >
                <span
                  className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--field)" }}
                />
                {year} シーズン
              </span>
            )}
          </div>

          {/* Main heading */}
          <h1
            style={{
              fontFamily:
                "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              letterSpacing: "0.04em",
            }}
          >
            <span
              className="block"
              style={{
                fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
                color: "var(--text-primary)",
                lineHeight: 1.15,
              }}
            >
              {year} 順位予想ダッシュボード
            </span>
          </h1>

          {/* Score indicator */}
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <p
                className="text-xs font-medium"
                style={{
                  color: "var(--text-muted)",
                  letterSpacing: "0.08em",
                }}
              >
                歴代最高
              </p>
              <p
                style={{
                  fontFamily:
                    "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  fontSize: "clamp(2.5rem, 8vw, 4rem)",
                  lineHeight: 1,
                  color: "var(--field)",
                  letterSpacing: "0.02em",
                }}
              >
                +{BEST_SCORE}
              </p>
            </div>
            <div
              className="mb-1.5 h-8 w-px"
              style={{ background: "var(--border-primary)" }}
            />
            <div>
              <p
                className="text-xs font-medium"
                style={{
                  color: "var(--text-muted)",
                  letterSpacing: "0.08em",
                }}
              >
                満点
              </p>
              <p
                style={{
                  fontFamily:
                    "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  fontSize: "clamp(2.5rem, 8vw, 4rem)",
                  lineHeight: 1,
                  color: "var(--text-secondary)",
                  letterSpacing: "0.02em",
                }}
              >
                +{PERFECT_SCORE}
              </p>
            </div>

            {/* Progress bar visual */}
            <div className="ml-auto hidden w-48 sm:block">
              <div
                className="h-3 w-full overflow-hidden rounded-full"
                style={{ background: "var(--bg-inset)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((BEST_SCORE / PERFECT_SCORE) * 100)}%`,
                    background:
                      "linear-gradient(90deg, var(--field), var(--border-strong))",
                  }}
                />
              </div>
              <p
                className="mt-1 text-right text-[10px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                満点比 {Math.round((BEST_SCORE / PERFECT_SCORE) * 100)}%
              </p>
            </div>
          </div>

          {/* Tagline */}
          <p
            className="mt-4 text-sm"
            style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          >
            {topScorer
              ? `現在のトップは ${topScorer.name}（+${topScorer.effectiveTotal}）。`
              : ""}
            あなたは歴代最高+{BEST_SCORE}を超えられる？
          </p>

          {/* CTA */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/predictions/new"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all"
              style={{
                background: "var(--field)",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(31,122,63,0.24)",
              }}
            >
              今すぐ予想する
              <span style={{ fontSize: "1.1em" }}>&#8594;</span>
            </Link>
            <Link
              href="/rankings/scoreboard"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              ランキングを見る
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ PREDICTION DISTRIBUTION ══════════ */}
      {(centralDist.length > 0 || pacificDist.length > 0) && (
        <section
          className="overflow-hidden rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded text-xs"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-secondary)",
                }}
              >
                &#128202;
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {year}年 優勝予想分布
              </span>
            </div>
            <Link
              href="/predictions"
              className="inline-flex min-h-9 items-center text-xs font-medium transition-colors"
              style={{
                color: "var(--stitch)",
                letterSpacing: "0.08em",
              }}
            >
              全予想を見る &#8594;
            </Link>
          </div>

          <div className="grid md:grid-cols-2">
            {/* Central */}
            {centralDist.length > 0 && (
              <div
                className="p-5"
                style={{
                  borderRight: "1px solid var(--border-primary)",
                }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-black"
                    style={{
                      background: "var(--central)",
                      color: "#fff",
                    }}
                  >
                    &#12475;
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    セ・リーグ 1位予想
                  </span>
                </div>
                <div className="space-y-2.5">
                  {centralDist.map((t) => (
                    <DistributionBar key={t.teamName} team={t} />
                  ))}
                </div>
              </div>
            )}

            {/* Pacific */}
            {pacificDist.length > 0 && (
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-black"
                    style={{
                      background: "var(--pacific)",
                      color: "#fff",
                    }}
                  >
                    &#12497;
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    パ・リーグ 1位予想
                  </span>
                </div>
                <div className="space-y-2.5">
                  {pacificDist.map((t) => (
                    <DistributionBar key={t.teamName} team={t} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════ LATEST NEWS ══════════ */}
      {latestNews.length > 0 && (
        <section
          className="overflow-hidden rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded text-xs"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--stitch)",
                }}
              >
                &#128293;
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                最新ニュース
              </span>
            </div>
            <Link
              href="/news"
              className="inline-flex min-h-9 items-center text-xs font-medium transition-colors"
              style={{
                color: "var(--stitch)",
                letterSpacing: "0.08em",
              }}
            >
              すべて見る &#8594;
            </Link>
          </div>

          <div className="p-4">
            <NewsCompact items={latestNews} />
          </div>
        </section>
      )}

      {/* ══════════ PREDICTION NEWS PREVIEW ══════════ */}
      {latestNews.filter((n) => n.type === "prediction").length > 0 && (
        <section
          className="overflow-hidden rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded text-xs"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-secondary)",
                }}
              >
                &#128240;
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                最新の予想ニュース
              </span>
            </div>
            <Link
              href="/news"
              className="inline-flex min-h-9 items-center text-xs font-medium transition-colors"
              style={{
                color: "var(--stitch)",
                letterSpacing: "0.08em",
              }}
            >
              すべてのニュースを見る &#8594;
            </Link>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
            {latestNews
              .filter((n) => n.type === "prediction")
              .slice(0, 2)
              .map((news) => (
                <div key={news.id} className="px-5 py-4">
                  {news.commentator && (
                    <span
                      className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: "rgba(124,58,237,0.08)",
                        color: "#7c3aed",
                        border: "1px solid rgba(124,58,237,0.15)",
                      }}
                    >
                      {news.commentator}
                    </span>
                  )}
                  <h3
                    className="text-sm font-bold leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {news.title}
                  </h3>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {news.body.length > 80
                      ? `${news.body.slice(0, 80)}...`
                      : news.body}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ══════════ IMAGE GENERATION CTA ══════════ */}
      <section
        className="overflow-hidden rounded-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-primary)",
        }}
      >
        <div className="px-6 py-8 text-center sm:px-10">
          <span
            className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full text-xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-primary)",
            }}
          >
            &#128444;&#65039;
          </span>
          <h2
            className="mt-3 text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            あなたの予想を新聞一面に
          </h2>
          <p
            className="mt-1.5 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            予想を登録して、スポーツ新聞風の画像を自動生成。X でシェアしよう！
          </p>
          <div className="mt-5">
            <Link
              href="/predictions/new"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all"
              style={{
                background: "var(--stitch)",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(229,57,53,0.3)",
              }}
            >
              予想を登録して画像を作る
              <span style={{ fontSize: "1.1em" }}>&#8594;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ GROUPS ══════════ */}
      <section
        className="overflow-hidden rounded-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-primary)",
        }}
      >
        <div className="px-6 py-8 text-center sm:px-10">
          <span
            className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full text-xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-primary)",
            }}
          >
            &#128101;
          </span>
          <h2
            className="mt-3 text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            対決グループ
          </h2>
          <p
            className="mt-1.5 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            友達と予想を競おう！グループを作って順位を比較できます。
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/groups/new"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                background: "var(--field)",
                color: "#fff",
              }}
            >
              グループを作る
            </Link>
            <Link
              href="/groups/join"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              招待コードで参加
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ SCORE RULES (Compact) ══════════ */}
      <section
        className="overflow-hidden rounded-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-primary)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 px-5 py-3"
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
            &#128207;
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            採点ルール
          </span>
        </div>

        <div className="px-5 py-4">
          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {SCORE_CHIPS.map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{
                  background: chip.positive
                    ? "rgba(46,125,50,0.06)"
                    : "rgba(229,57,53,0.06)",
                  border: `1px solid ${
                    chip.positive
                      ? "rgba(46,125,50,0.2)"
                      : "rgba(229,57,53,0.2)"
                  }`,
                }}
              >
                <span
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {chip.label}
                </span>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{
                    fontFamily:
                      "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                    color: chip.positive ? "var(--field)" : "var(--stitch)",
                    letterSpacing: "0.03em",
                  }}
                >
                  {chip.score}
                </span>
              </div>
            ))}
          </div>

          {/* Extra info */}
          <p
            className="mt-3 text-xs leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            順位予想は6チーム x 2リーグ = 最大+60点。タイトル的中で+3点ボーナス。
          </p>
        </div>
      </section>

      {/* ══════════ PAST SEASONS ══════════ */}
      {seasons.length > 1 && (
        <section>
          <div className="mb-3 flex items-center gap-4">
            <span
              className="shrink-0 text-xs font-bold tracking-widest"
              style={{
                fontFamily:
                  "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                color: "var(--text-muted)",
                letterSpacing: "0.2em",
              }}
            >
              過去シーズン
            </span>
            <div
              className="h-px flex-1"
              style={{ background: "var(--border-primary)" }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {seasons
              .filter((s) => !s.isActive)
              .map((s) => (
                <Link
                  key={s.id}
                  href={`/standings?year=${s.year}`}
                  className="rounded-lg px-4 py-2.5 text-xs font-medium transition-all"
                  style={{
                    border: "1px solid var(--border-primary)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {s.label}
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ──

function DistributionBar({ team }: { team: TeamCount }) {
  // Minimum bar width so even 1% is visible
  const barWidth = Math.max(team.pct, 4);

  return (
    <div className="flex items-center gap-3">
      <span
        className="w-24 shrink-0 truncate whitespace-nowrap text-right text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}
        title={team.teamName}
      >
        {team.displayName}
      </span>
      <div
        className="h-6 flex-1 overflow-hidden rounded"
        style={{ background: "var(--bg-inset)" }}
      >
        <div
          className="flex h-full items-center rounded px-2"
          style={{
            width: `${barWidth}%`,
            background: team.color,
            transition: "width 0.6s ease",
            minWidth: "2rem",
          }}
        >
          <span
            className="text-xs font-bold tabular-nums"
            style={{
              color: needsDarkText(team.color) ? "#1a1a1a" : "#fff",
              textShadow: needsDarkText(team.color)
                ? "none"
                : "0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            {team.pct}%
          </span>
        </div>
      </div>
      <span
        className="w-6 shrink-0 text-center text-xs tabular-nums"
        style={{ color: "var(--text-muted)" }}
      >
        {team.count}
      </span>
    </div>
  );
}

/** Returns true for light-colored team backgrounds that need dark text */
function needsDarkText(color: string): boolean {
  const lightColors = ["#FBBF24", "#F5D100"];
  return lightColors.includes(color);
}
