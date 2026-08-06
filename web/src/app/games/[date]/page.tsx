export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { gameResults, seasons } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { canonicalAlternates, clampDescription, socialPreview } from "@/lib/seo-meta";
import { NPB_TEAMS } from "@/lib/teams";
import { shiftIsoDate } from "@/lib/date-navigation";

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `${date} 試合結果 | NPB予想リーグ`,
    description: clampDescription(
      `${date} のプロ野球試合結果スコアボード。セ・パ・交流戦の勝敗・スコア・勝利チームを表示。`,
    ),
    alternates: canonicalAlternates(`/games/${date}`),
    ...socialPreview({
      title: `${date} 試合結果 | NPB予想リーグ`,
      description: `${date} の全試合スコア`,
      pathname: `/games/${date}`,
    }),
  };
}

function teamColor(name: string): string {
  return NPB_TEAMS.find((t) => t.name === name)?.color ?? "#999";
}

function teamShort(name: string): string {
  return NPB_TEAMS.find((t) => t.name === name)?.shortName ?? name;
}

export default async function GameDatePage({ params }: Props) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return (
      <div className="text-[var(--text-secondary)]">日付形式が不正です: {date}</div>
    );
  }

  const db = getDb();
  const activeSeason = (
    await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1)
  )[0];

  const games = activeSeason
    ? await db
        .select()
        .from(gameResults)
        .where(and(eq(gameResults.seasonId, activeSeason.id), eq(gameResults.gameDate, date)))
        .orderBy(desc(gameResults.snapshotDate))
    : [];

  // Dedupe by home+away, keep latest snapshot only
  type G = (typeof games)[number];
  const byKey = new Map<string, G>();
  for (const g of games) {
    const key = `${g.homeTeam}:${g.awayTeam}`;
    if (!byKey.has(key)) byKey.set(key, g);
  }
  const uniqueGames = [...byKey.values()];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{date} 試合結果</h1>
        <div className="flex gap-1 text-sm">
          <Link
            href={`/games/${shiftIsoDate(date, -1)}`}
            className="px-3 py-1.5 rounded border"
            style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
          >
            ← 前日
          </Link>
          <Link
            href={`/games/${shiftIsoDate(date, 1)}`}
            className="px-3 py-1.5 rounded border"
            style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
          >
            翌日 →
          </Link>
        </div>
      </div>

      {uniqueGames.length === 0 && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            border: "1px dashed var(--border-primary)",
            background: "rgba(0,0,0,0.02)",
            color: "var(--text-secondary)",
          }}
        >
          この日付の試合データはまだありません。
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {uniqueGames.map((g) => {
          const final = g.status === "final";
          const postponed = g.status === "postponed" || g.status === "cancelled";
          const inProgress = g.status === "in_progress";
          return (
            <div
              key={g.id}
              className="rounded-lg px-4 py-3"
              style={{
                border: "1px solid var(--border-primary)",
                background: "var(--surface-card)",
                opacity: postponed ? 0.6 : 1,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{
                    background: final ? "#E53935" : inProgress ? "#F59E0B" : "#6B7280",
                    color: "#fff",
                  }}
                >
                  {final ? "試合終了" : inProgress ? "試合中" : postponed ? "中止" : "試合前"}
                </span>
                {g.stadium && (
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {g.stadium}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-1.5 h-6 rounded"
                    style={{ background: teamColor(g.awayTeam) }}
                  />
                  <span className={`font-semibold ${g.winner === "away" ? "text-[var(--stitch)]" : ""}`}>
                    {teamShort(g.awayTeam)}
                  </span>
                </div>
                <div className="font-bold text-xl tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {g.awayScore ?? "-"} <span className="text-sm opacity-60">-</span> {g.homeScore ?? "-"}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className={`font-semibold ${g.winner === "home" ? "text-[var(--stitch)]" : ""}`}>
                    {teamShort(g.homeTeam)}
                  </span>
                  <span
                    className="inline-block w-1.5 h-6 rounded"
                    style={{ background: teamColor(g.homeTeam) }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
