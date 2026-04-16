export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import type { Prediction, Season } from "@/lib/types";
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
  };
}

function TeamBadge({ teamName }: { teamName: string }) {
  const team = getTeamByName(teamName);
  if (!team) return <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <div
      className="flex items-center justify-center rounded-sm py-1 text-[11px] font-bold"
      style={{
        background: team.color,
        color: team.textColor,
        textShadow: team.textColor === "#fff" ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {team.shortName}
    </div>
  );
}

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : await getActiveYear();

  const [predictions, allSeasons] = await Promise.all([
    getPredictions(year),
    getAllSeasons(),
  ]);

  // Only show predictions that have at least some picks
  const filtered = predictions.filter((p) => p.rankingPicks.length > 0);

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
            <span style={{ color: "var(--stitch)" }}>{year}</span> {"\u9806\u4F4D\u4E88\u60F3\u4E00\u89A7"}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {filtered.length}{"\u4EBA"}
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
                href={`/rankings/predictions?year=${s.year}`}
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

      {/* Matrix: セ・パ横並び */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>
            {year}{"\u5E74\u306E\u4E88\u60F3\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093"}
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-10 px-3 py-1.5 text-left text-xs"
                  rowSpan={2}
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text-muted)",
                    background: "var(--bg-inset)",
                    borderBottom: "2px solid var(--border-primary)",
                    letterSpacing: "0.08em",
                    minWidth: "8rem",
                    verticalAlign: "bottom",
                  }}
                >
                  {"\u4E88\u60F3\u8005"}
                </th>
                {/* セ・リーグ header */}
                <th
                  colSpan={6}
                  className="px-1 py-1.5 text-center text-xs font-bold"
                  style={{
                    background: "var(--central, #1E40AF)",
                    color: "#fff",
                    letterSpacing: "0.1em",
                    borderBottom: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {"\u30BB\u30FB\u30EA\u30FC\u30B0"}
                </th>
                {/* Separator */}
                <th
                  rowSpan={2}
                  className="w-1"
                  style={{
                    background: "var(--bg-inset)",
                    borderBottom: "2px solid var(--border-primary)",
                    minWidth: "4px",
                    maxWidth: "4px",
                  }}
                />
                {/* パ・リーグ header */}
                <th
                  colSpan={6}
                  className="px-1 py-1.5 text-center text-xs font-bold"
                  style={{
                    background: "var(--pacific, #B91C1C)",
                    color: "#fff",
                    letterSpacing: "0.1em",
                    borderBottom: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {"\u30D1\u30FB\u30EA\u30FC\u30B0"}
                </th>
              </tr>
              <tr>
                {/* セ 1-6位 */}
                {[1, 2, 3, 4, 5, 6].map((rank) => (
                  <th
                    key={`c-${rank}`}
                    className="px-1 py-1.5 text-center"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.75rem",
                      color: rank === 1 ? "var(--dirt)" : "var(--text-muted)",
                      background: "var(--bg-inset)",
                      borderBottom: "2px solid var(--border-primary)",
                      minWidth: "3.5rem",
                    }}
                  >
                    {rank}{"\u4F4D"}
                  </th>
                ))}
                {/* パ 1-6位 */}
                {[1, 2, 3, 4, 5, 6].map((rank) => (
                  <th
                    key={`p-${rank}`}
                    className="px-1 py-1.5 text-center"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.75rem",
                      color: rank === 1 ? "var(--dirt)" : "var(--text-muted)",
                      background: "var(--bg-inset)",
                      borderBottom: "2px solid var(--border-primary)",
                      minWidth: "3.5rem",
                    }}
                  >
                    {rank}{"\u4F4D"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((pred, idx) => {
                const centralPicks = pred.rankingPicks
                  .filter((rp) => rp.league === "central")
                  .sort((a, b) => a.rank - b.rank);
                const pacificPicks = pred.rankingPicks
                  .filter((rp) => rp.league === "pacific")
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
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {pred.user.sourceUrl ? (
                            <a
                              href={pred.user.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-opacity hover:opacity-70"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {pred.user.source}
                            </a>
                          ) : (
                            pred.user.source
                          )}
                        </div>
                      )}
                    </td>
                    {/* セ 1-6 */}
                    {[1, 2, 3, 4, 5, 6].map((rank) => {
                      const pick = centralPicks.find((p) => p.rank === rank);
                      return (
                        <td key={`c-${rank}`} className="p-0.5">
                          {pick ? <TeamBadge teamName={pick.teamName} /> : (
                            <div className="flex items-center justify-center py-1 text-xs" style={{ color: "var(--text-muted)" }}>—</div>
                          )}
                        </td>
                      );
                    })}
                    {/* Separator */}
                    <td
                      style={{
                        background: "var(--bg-inset)",
                        minWidth: "4px",
                        maxWidth: "4px",
                      }}
                    />
                    {/* パ 1-6 */}
                    {[1, 2, 3, 4, 5, 6].map((rank) => {
                      const pick = pacificPicks.find((p) => p.rank === rank);
                      return (
                        <td key={`p-${rank}`} className="p-0.5">
                          {pick ? <TeamBadge teamName={pick.teamName} /> : (
                            <div className="flex items-center justify-center py-1 text-xs" style={{ color: "var(--text-muted)" }}>—</div>
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
        {"\u30C7\u30FC\u30BF\u30BD\u30FC\u30B9"}: ohtashp.com — {filtered.length}{"\u4EBA\u306E\u89E3\u8AAC\u8005\u30FB\u8A55\u8AD6\u5BB6\u306E\u958B\u5E55\u524D\u4E88\u60F3"}
      </p>
    </div>
  );
}
