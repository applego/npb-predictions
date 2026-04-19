export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prediction, ScoreboardResponse } from "@/lib/types";
import { LEAGUE_LABELS, TITLE_CATEGORY_LABELS } from "@/lib/types";
import ShareButton from "@/components/ShareButton";
import {
  canonicalAlternates,
  clampDescription,
  ogImageUrl,
  socialPreview,
} from "@/lib/seo-meta";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const DEFAULT_YEAR = new Date().getFullYear();

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ year?: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;

  const [prediction, scoreboard] = await Promise.all([
    getUserPrediction(year, userId),
    getScoreboard(year),
  ]);

  const userName = prediction?.user.name ?? "参加者";
  const numericId = parseInt(userId, 10);
  const userScore = scoreboard?.scores.find((s) => s.userId === numericId);
  const userRankIndex =
    scoreboard?.scores.findIndex((s) => s.userId === numericId) ?? -1;

  const rankText =
    userRankIndex >= 0 ? `総合${userRankIndex + 1}位` : "未ランク";
  const scoreText = userScore
    ? `合計${userScore.totalScore}pt（順位点${userScore.rankingScore}／タイトル点${userScore.titleScore}）`
    : "スコア集計待ち";

  const title = `${userName}の${year}年プロ野球順位予想 — NPB予想リーグ`;
  const description = clampDescription(
    `${userName}さんの${year}年NPB予想リーグ成績。${rankText}・${scoreText}。セ・パ両リーグの順位予想とタイトル予想の的中状況を確認できます。`
  );
  const pathname = `/users/${userId}?year=${year}`;
  const og = ogImageUrl("prediction", { year, userId: numericId });

  return {
    title,
    description,
    ...socialPreview({ title, description, pathname, ogImage: og }),
    alternates: canonicalAlternates(pathname),
  };
}

async function getUserPrediction(
  year: number,
  userId: string
): Promise<Prediction | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/seasons/${year}/users/${userId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json() as Promise<Prediction | null>;
  } catch {
    return null;
  }
}

async function getScoreboard(year: number): Promise<ScoreboardResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/seasons/${year}/current-scoreboard`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json() as Promise<ScoreboardResponse | null>;
  } catch {
    return null;
  }
}

const TABLE_STYLE = {
  background: "#0a1525",
  border: "1px solid rgba(255,255,255,0.05)",
};

const TH_STYLE = {
  color: "rgba(255,255,255,0.3)",
  letterSpacing: "0.12em",
};

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { userId } = await params;
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;

  const [prediction, scoreboard] = await Promise.all([
    getUserPrediction(year, userId),
    getScoreboard(year),
  ]);

  if (!prediction) notFound();

  const user = prediction.user;
  const userScore = scoreboard?.scores.find(
    (s) => s.userId === parseInt(userId, 10)
  );
  const userRank =
    scoreboard?.scores.findIndex(
      (s) => s.userId === parseInt(userId, 10)
    ) ?? -1;
  const isLeader = userRank === 0;

  const leagues = ["central", "pacific"] as const;

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold"
            style={{
              background: isLeader ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.06)",
              border: isLeader ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(255,255,255,0.1)",
              color: isLeader ? "#fbbf24" : "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {user.name}
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              {year}シーズン予想
            </p>
          </div>
        </div>
        <ShareButton
          type="prediction"
          year={year}
          userId={parseInt(userId, 10)}
          userName={user.name}
        />
      </div>

      {/* Score cards */}
      {userScore && (
        <div className="grid gap-3 sm:grid-cols-4">
          <ScoreCard
            label="総合順位"
            value={`${userRank + 1}位`}
            sub={`/ ${scoreboard!.scores.length}人`}
            highlight={isLeader}
          />
          <ScoreCard
            label="合計スコア"
            value={String(userScore.totalScore)}
            highlight={isLeader}
          />
          <ScoreCard label="順位点" value={String(userScore.rankingScore)} />
          <ScoreCard label="タイトル点" value={String(userScore.titleScore)} />
        </div>
      )}

      {/* Ranking Picks */}
      {leagues.map((league) => {
        const picks = prediction.rankingPicks
          .filter((rp) => rp.league === league)
          .sort((a, b) => a.rank - b.rank);
        if (picks.length === 0) return null;

        return (
          <div key={league}>
            <SectionLabel>{LEAGUE_LABELS[league]} 順位予想</SectionLabel>
            <div className="overflow-x-auto rounded-xl" style={TABLE_STYLE}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["順位", "チーム"].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium uppercase"
                        style={TH_STYLE}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {picks.map((pick) => (
                    <tr
                      key={pick.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td
                        className="px-4 py-3 text-sm"
                        style={{
                          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                          color: "rgba(251,191,36,0.6)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {pick.rank}位
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ color: "rgba(255,255,255,0.75)" }}
                      >
                        {pick.teamName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Title Picks */}
      {leagues.map((league) => {
        const picks = prediction.titlePicks.filter(
          (tp) => tp.league === league
        );
        if (picks.length === 0) return null;

        return (
          <div key={`title-${league}`}>
            <SectionLabel>{LEAGUE_LABELS[league]} タイトル予想</SectionLabel>
            <div className="overflow-x-auto rounded-xl" style={TABLE_STYLE}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["タイトル", "選手", "チーム"].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium uppercase"
                        style={TH_STYLE}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {picks.map((pick) => (
                    <tr
                      key={pick.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td
                        className="px-4 py-3 text-xs font-medium uppercase tracking-wide"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        {TITLE_CATEGORY_LABELS[pick.category] ?? pick.category}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ color: "rgba(255,255,255,0.8)" }}
                      >
                        {pick.playerName}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {pick.teamName ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Footer nav */}
      <div className="flex gap-4 pt-2">
        <Link
          href={`/standings?year=${year}`}
          className="text-sm transition-colors hover:text-amber-400"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          ← Standings
        </Link>
        <Link
          href={`/predictions?year=${year}`}
          className="text-sm transition-colors hover:text-amber-400"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Predictions Compare
        </Link>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        background: highlight ? "rgba(251,191,36,0.06)" : "#0a1525",
        border: highlight
          ? "1px solid rgba(251,191,36,0.2)"
          : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {highlight && (
        <div
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{
            background: "linear-gradient(to bottom, #fbbf24, rgba(251,191,36,0.2))",
          }}
        />
      )}
      <p
        className="text-xs font-medium uppercase"
        style={{
          color: highlight ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.3)",
          letterSpacing: "0.14em",
        }}
      >
        {label}
      </p>
      <p
        className="mt-2 leading-none"
        style={{
          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
          fontSize: "2rem",
          letterSpacing: "0.05em",
          color: highlight ? "#fbbf24" : "rgba(255,255,255,0.85)",
        }}
      >
        {value}
        {sub && (
          <span
            className="ml-1 text-base"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span
        style={{
          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
          fontSize: "1.1rem",
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        {children}
      </span>
      <div
        className="h-px flex-1"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
    </div>
  );
}
