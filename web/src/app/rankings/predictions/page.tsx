export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { Prediction, Season } from "@/lib/types";
import { LEAGUE_LABELS } from "@/lib/types";
import { getTeamByName } from "@/lib/teams";
import ShareButton from "@/components/ShareButton";

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://npb-predictions.pages.dev";

async function getActiveYear(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons`, { cache: "no-store" });
    if (!res.ok) return new Date().getFullYear();
    const seasons = (await res.json()) as Season[];
    const active = seasons.find((s) => s.isActive) ?? seasons[0];
    return active?.year ?? new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
}

async function getAllSeasons(): Promise<Season[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json() as Promise<Season[]>;
  } catch {
    return [];
  }
}

async function getPredictions(year: number): Promise<Prediction[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seasons/${year}/predictions`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json() as Promise<Prediction[]>;
  } catch {
    return [];
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}): Promise<Metadata> {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : await getActiveYear();
  return {
    title: `${year}年 順位予想一覧`,
    description: `${year}年NPB予想リーグ — 全予想家のセ・パ順位予想を一覧表示。`,
    alternates: { canonical: `/predictions?year=${year}` },
  };
}

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; league?: string }>;
}) {
  const { year: yearParam, league: leagueParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : await getActiveYear();
  const league = leagueParam === "pacific" ? "pacific" : "central";

  const [predictions, allSeasons] = await Promise.all([
    getPredictions(year),
    getAllSeasons(),
  ]);

  // Filter predictions that have picks for this league
  const filtered = predictions.filter((p) =>
    p.rankingPicks.some((rp) => rp.league === league)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              letterSpacing: "0.04em",
              color: "var(--text-primary)",
            }}
          >
            <span style={{ color: "var(--stitch)" }}>{year}</span> 順位予想一覧
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {filtered.length}人 — {LEAGUE_LABELS[league]}
          </p>
        </div>
        <ShareButton type="scoreboard" year={year} />
      </div>

      {/* Year selector */}
      {allSeasons.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {allSeasons
            .sort((a, b) => b.year - a.year)
            .map((s) => (
              <Link
                key={s.year}
                href={`/predictions?year=${s.year}&league=${league}`}
                className="rounded-sm px-3 py-2 text-xs font-medium"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.06em",
                  background: s.year === year ? "var(--stitch)" : "var(--bg-surface)",
                  color: s.year === year ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${s.year === year ? "var(--stitch)" : "var(--border-primary)"}`,
                }}
              >
                {s.year}
              </Link>
            ))}
        </div>
      )}

      {/* League tabs */}
      <div className="flex gap-0">
        {(["central", "pacific"] as const).map((l) => {
          const active = l === league;
          const color = l === "central" ? "var(--central)" : "var(--pacific)";
          return (
            <Link
              key={l}
              href={`/predictions?year=${year}&league=${l}`}
              className="px-5 py-2.5 text-sm font-bold"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.08em",
                color: active ? "#fff" : "var(--text-muted)",
                background: active ? color : "var(--bg-surface)",
                borderBottom: active ? `3px solid ${color}` : "3px solid var(--border-primary)",
              }}
            >
              {LEAGUE_LABELS[l]}
            </Link>
          );
        })}
        <div className="flex-1" style={{ borderBottom: "3px solid var(--border-primary)" }} />
      </div>

      {/* Matrix: predictors as ROWS, ranks 1-6 as COLUMNS */}
      {filtered.length === 0 ? (
        <div className="card rounded-lg p-10 text-center">
          <p style={{ color: "var(--text-muted)" }}>
            {year}年{LEAGUE_LABELS[league]}の予想データがありません
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto rounded-lg">
          <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-10 px-3 py-2.5 text-left text-xs"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text-muted)",
                    background: "var(--bg-inset)",
                    borderBottom: "2px solid var(--border-primary)",
                    letterSpacing: "0.08em",
                    minWidth: "8rem",
                  }}
                >
                  予想者
                </th>
                {[1, 2, 3, 4, 5, 6].map((rank) => (
                  <th
                    key={rank}
                    className="px-1 py-2.5 text-center"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.9rem",
                      color: rank === 1 ? "var(--dirt)" : "var(--text-muted)",
                      background: "var(--bg-inset)",
                      borderBottom: "2px solid var(--border-primary)",
                      minWidth: "5rem",
                    }}
                  >
                    {rank}位
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((pred, idx) => {
                const picks = pred.rankingPicks
                  .filter((rp) => rp.league === league)
                  .sort((a, b) => a.rank - b.rank);

                return (
                  <tr
                    key={pred.id}
                    style={{
                      borderBottom: "1px solid var(--border-primary)",
                      background: idx % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                    }}
                  >
                    {/* Predictor name (sticky) */}
                    <td
                      className="sticky left-0 z-10 px-3 py-1.5"
                      style={{
                        background: idx % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                        borderRight: "1px solid var(--border-primary)",
                      }}
                    >
                      <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                        {pred.user.name}
                      </div>
                      {pred.user.source && (
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {pred.user.sourceUrl ? (
                            <a
                              href={pred.user.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-opacity hover:opacity-70"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {pred.user.source} ↗
                            </a>
                          ) : (
                            pred.user.source
                          )}
                        </div>
                      )}
                    </td>
                    {/* Rank cells 1-6 */}
                    {[1, 2, 3, 4, 5, 6].map((rank) => {
                      const pick = picks.find((p) => p.rank === rank);
                      const team = pick ? getTeamByName(pick.teamName) : null;
                      return (
                        <td key={rank} className="p-0.5">
                          {team ? (
                            <div
                              className="flex items-center justify-center rounded-sm py-1.5 text-xs font-bold"
                              style={{
                                background: team.color,
                                color: team.textColor,
                                textShadow: team.textColor === "#fff" ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                              }}
                            >
                              {team.shortName}
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center rounded-sm py-1.5 text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        データソース: ohtashp.com — {filtered.length}人の解説者・評論家の開幕前予想
      </p>
    </div>
  );
}
