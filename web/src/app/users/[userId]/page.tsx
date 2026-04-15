export const runtime = "edge";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prediction, ScoreboardResponse } from "@/lib/types";
import { LEAGUE_LABELS, TITLE_CATEGORY_LABELS } from "@/lib/types";
import ShareButton from "@/components/ShareButton";
import { ScoreHistoryChart, type ScoreHistoryEntry } from "@/components/ScoreHistoryChart";
import { getDb } from "@/db";
import { users, seasons, predictions, rankingPicks, titlePicks, scoreSnapshots } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const DEFAULT_YEAR = new Date().getFullYear();

// ── Direct DB helpers (avoids self-referential fetch on CF Pages) ──

async function getUserPrediction(
  year: number,
  userId: number,
): Promise<Prediction | null> {
  const db = getDb();

  const [season] = await db.select().from(seasons).where(eq(seasons.year, year));
  if (!season) return null;

  const pred = await db.query.predictions.findFirst({
    where: and(eq(predictions.seasonId, season.id), eq(predictions.userId, userId)),
    with: { user: true, rankingPicks: true, titlePicks: true },
  });
  if (!pred) return null;

  // Map to Prediction type (user field must match)
  return {
    id: pred.id,
    userId: pred.userId,
    seasonId: pred.seasonId,
    isLocked: pred.isLocked,
    lockedAt: pred.lockedAt instanceof Date ? pred.lockedAt.toISOString() : (pred.lockedAt ?? null),
    user: {
      id: pred.user.id,
      name: pred.user.name,
      slug: pred.user.slug,
      avatarUrl: pred.user.avatarUrl,
      role: pred.user.role ?? undefined,
      source: pred.user.source,
      variant: pred.user.variant,
      firebaseUid: pred.user.firebaseUid,
      email: pred.user.email,
    },
    rankingPicks: pred.rankingPicks.map((rp) => ({
      id: rp.id,
      predictionId: rp.predictionId,
      league: rp.league,
      rank: rp.rank,
      teamName: rp.teamName,
    })),
    titlePicks: pred.titlePicks.map((tp) => ({
      id: tp.id,
      predictionId: tp.predictionId,
      league: tp.league,
      category: tp.category,
      playerName: tp.playerName,
      teamName: tp.teamName,
    })),
  };
}

async function getScoreboard(year: number): Promise<ScoreboardResponse | null> {
  const db = getDb();

  const [season] = await db.select().from(seasons).where(eq(seasons.year, year));
  if (!season) return null;

  const snaps = await db
    .select()
    .from(scoreSnapshots)
    .where(eq(scoreSnapshots.seasonId, season.id))
    .orderBy(desc(scoreSnapshots.totalScore));

  if (snaps.length === 0) {
    return {
      season: {
        id: season.id, year: season.year, label: season.label,
        isActive: season.isActive,
        lockDate: season.lockDate instanceof Date ? season.lockDate.toISOString() : (season.lockDate ?? null),
        createdAt: season.createdAt instanceof Date ? season.createdAt.toISOString() : String(season.createdAt),
      },
      scores: [],
    };
  }

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const seen = new Set<number>();
  const scores: ScoreboardResponse["scores"] = [];
  for (const s of snaps) {
    if (seen.has(s.userId)) continue;
    seen.add(s.userId);
    const u = userMap.get(s.userId);
    if (!u || u.role !== "friend") continue;
    scores.push({
      userId: u.id,
      userName: u.name,
      rankingScore: s.rankingScore,
      titleScore: s.titleScore,
      totalScore: s.totalScore,
      snapshotDate: s.snapshotDate instanceof Date ? s.snapshotDate.toISOString() : new Date().toISOString(),
    });
  }

  return {
    season: {
      id: season.id, year: season.year, label: season.label,
      isActive: season.isActive,
      lockDate: season.lockDate instanceof Date ? season.lockDate.toISOString() : (season.lockDate ?? null),
      createdAt: season.createdAt instanceof Date ? season.createdAt.toISOString() : String(season.createdAt),
    },
    scores,
  };
}

async function getUserHistory(userId: number): Promise<ScoreHistoryEntry[]> {
  const db = getDb();

  const [allSeasons, snaps] = await Promise.all([
    db.select().from(seasons),
    db.select().from(scoreSnapshots).where(eq(scoreSnapshots.userId, userId)),
  ]);

  const snapBySeason = new Map<number, (typeof snaps)[0]>();
  for (const s of snaps) {
    const existing = snapBySeason.get(s.seasonId);
    if (!existing || s.totalScore > existing.totalScore) {
      snapBySeason.set(s.seasonId, s);
    }
  }

  return allSeasons
    .sort((a, b) => a.year - b.year)
    .flatMap((season) => {
      const snap = snapBySeason.get(season.id);
      if (!snap) return [];
      return [
        {
          year: season.year,
          totalScore: snap.totalScore,
          rankingScore: snap.rankingScore,
          titleScore: snap.titleScore,
        },
      ];
    });
}

// ── Page ──

const TABLE_STYLE = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-primary)",
};

const TH_STYLE = {
  color: "var(--text-muted)",
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

  const userIdNum = parseInt(userId, 10);
  if (isNaN(userIdNum)) notFound();

  const [prediction, scoreboard, history] = await Promise.all([
    getUserPrediction(year, userIdNum),
    getScoreboard(year),
    getUserHistory(userIdNum),
  ]);

  if (!prediction) notFound();

  const user = prediction.user;
  const userScore = scoreboard?.scores.find((s) => s.userId === userIdNum);
  const userRank = scoreboard?.scores.findIndex((s) => s.userId === userIdNum) ?? -1;
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
              background: isLeader ? "rgba(229,57,53,0.12)" : "var(--border-primary)",
              border: isLeader ? "1px solid rgba(229,57,53,0.4)" : "1px solid var(--text-muted)",
              color: isLeader ? "var(--stitch)" : "var(--text-secondary)",
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
                color: "var(--text-primary)",
              }}
            >
              {user.name}
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
              {year}シーズン予想
            </p>
          </div>
        </div>
        <ShareButton
          type="prediction"
          year={year}
          userId={userIdNum}
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

      {/* Score Progression Chart */}
      {history.length >= 2 && (
        <div>
          <SectionLabel>スコア推移</SectionLabel>
          <div
            className="overflow-hidden rounded-xl p-4"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <ScoreHistoryChart history={history} />
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              ▪ 濃い赤 = 合計スコア ▪ 薄い赤 = うち順位点
            </p>
          </div>
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
                  <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
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
                      style={{ borderBottom: "1px solid var(--border-primary)" }}
                    >
                      <td
                        className="px-4 py-3 text-sm"
                        style={{
                          fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                          color: "rgba(229,57,53,0.6)",
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
                  <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
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
                      style={{ borderBottom: "1px solid var(--border-primary)" }}
                    >
                      <td
                        className="px-4 py-3 text-xs font-medium uppercase tracking-wide"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {TITLE_CATEGORY_LABELS[pick.category] ?? pick.category}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {pick.playerName}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "var(--text-muted)" }}
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
          style={{ color: "var(--text-secondary)" }}
        >
          ← Standings
        </Link>
        <Link
          href={`/predictions?year=${year}`}
          className="text-sm transition-colors hover:text-amber-400"
          style={{ color: "var(--text-secondary)" }}
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
        background: highlight ? "rgba(229,57,53,0.06)" : "var(--bg-surface)",
        border: highlight
          ? "1px solid rgba(229,57,53,0.2)"
          : "1px solid var(--border-primary)",
      }}
    >
      {highlight && (
        <div
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{
            background: "linear-gradient(to bottom, var(--stitch), rgba(229,57,53,0.2))",
          }}
        />
      )}
      <p
        className="text-xs font-medium uppercase"
        style={{
          color: highlight ? "rgba(229,57,53,0.6)" : "var(--text-muted)",
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
          color: highlight ? "var(--stitch)" : "var(--text-primary)",
        }}
      >
        {value}
        {sub && (
          <span
            className="ml-1 text-base"
            style={{ color: "var(--text-muted)" }}
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
          color: "var(--text-secondary)",
        }}
      >
        {children}
      </span>
      <div
        className="h-px flex-1"
        style={{ background: "var(--border-primary)" }}
      />
    </div>
  );
}
