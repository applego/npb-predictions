"use client";

export const runtime = "edge";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { getTeamByName } from "@/lib/teams";
import { downloadPredictionPng } from "@/lib/prediction-png";

interface PickDetail {
  rank: number;
  teamName: string;
  actualRank: number | null;
  score: number;
}

interface MemberScore {
  userId: number;
  name: string;
  slug: string;
  avatarUrl: string | null;
  centralScore: number;
  pacificScore: number;
  totalScore: number;
  hasPrediction: boolean;
  centralPicks: PickDetail[];
  pacificPicks: PickDetail[];
}

interface GroupDetail {
  group: {
    id: number;
    name: string;
    slug: string;
    inviteCode: string;
    createdAt: string;
  };
  members: Array<{
    userId: number;
    name: string;
    slug: string;
    avatarUrl: string | null;
  }>;
  season: { id: number; year: number } | null;
  scoreboard: MemberScore[];
  availableYears: number[];
}

export default function GroupDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { firebaseUser, loading: authLoading, signIn } = useAuth();
  const [data, setData] = useState<GroupDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [league, setLeague] = useState<"central" | "pacific">("central");

  const fetchGroup = useCallback(async () => {
    if (params.slug === "new") {
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const yearQ = year ? `?year=${year}` : "";
      const res = await fetch(`/api/groups/${params.slug}${yearQ}`);
      if (!res.ok) {
        setError("グループが見つかりません");
        return;
      }
      const json = (await res.json()) as GroupDetail;
      setData(json);
      if (!year && json.season) setYear(json.season.year);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setFetching(false);
    }
  }, [params.slug, year]);

  useEffect(() => {
    if (params.slug === "new") router.replace("/groups?create=1");
  }, [params.slug, router]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleCopyCode = async () => {
    if (!data) return;
    const url = `${window.location.origin}/groups/join?code=${data.group.inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--stitch)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card rounded-lg p-10 text-center">
        <p style={{ color: "var(--text-muted)" }}>{error ?? "Not found"}</p>
        <Link
          href="/groups"
          className="mt-4 inline-block text-sm"
          style={{ color: "var(--stitch)" }}
        >
          グループ一覧に戻る
        </Link>
      </div>
    );
  }

  const { group, scoreboard, availableYears, season } = data;
  const rankedBoard = scoreboard.map((s, idx) => ({ ...s, rank: idx + 1 }));

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/groups"
        className="inline-flex items-center gap-1 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 4L6 8L10 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        グループ
      </Link>

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
            {group.name}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {data.members.length}人のメンバー
          </p>
        </div>
      </div>

      {/* Invite code card */}
      <div
        className="card flex items-center gap-3 rounded-lg p-4"
        style={{ borderLeft: "3px solid var(--stitch)" }}
      >
        <div className="flex-1">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            招待コード
          </p>
          <p
            className="text-lg font-bold tracking-[0.3em]"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--stitch)",
            }}
          >
            {group.inviteCode}
          </p>
        </div>
        <button
          onClick={handleCopyCode}
          className="rounded-lg border px-3 py-2 text-xs font-medium transition hover:opacity-90"
          style={{
            borderColor: "var(--border-primary)",
            color: copied ? "var(--field)" : "var(--text-secondary)",
          }}
        >
          {copied ? "コピーしました" : "招待リンクをコピー"}
        </button>
      </div>

      {/* Year selector */}
      {availableYears.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {availableYears
            .sort((a, b) => b - a)
            .map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className="rounded-sm px-3 py-2 text-xs font-medium"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.06em",
                  background:
                    y === (season?.year ?? year) ? "var(--stitch)" : "var(--bg-surface)",
                  color:
                    y === (season?.year ?? year) ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${
                    y === (season?.year ?? year)
                      ? "var(--stitch)"
                      : "var(--border-primary)"
                  }`,
                }}
              >
                {y}
              </button>
            ))}
        </div>
      )}

      {/* Scoreboard */}
      <div className="card overflow-hidden rounded-lg">
        <div
          className="px-4 py-3"
          style={{
            background: "var(--bg-inset)",
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          <h2
            className="text-sm font-bold"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.08em",
              color: "var(--text-primary)",
            }}
          >
            SCOREBOARD {season ? season.year : ""}
          </h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
          {rankedBoard.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 px-4 py-3"
            >
              {/* Rank badge */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  background:
                    member.rank === 1
                      ? "var(--dirt)"
                      : member.rank === 2
                        ? "#A0AEC0"
                        : member.rank === 3
                          ? "#CD7F32"
                          : "var(--bg-elevated)",
                  color: member.rank <= 3 ? "#fff" : "var(--text-muted)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {member.rank}
              </div>

              {/* Avatar + name */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.name}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full"
                    unoptimized
                  />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--stitch)" }}
                  >
                    {member.name.charAt(0)}
                  </div>
                )}
                <Link
                  href={`/users/${member.slug}`}
                  className="truncate text-sm font-medium hover:underline"
                  style={{ color: "var(--text-primary)" }}
                >
                  {member.name}
                </Link>
              </div>

              {/* Score */}
              <div className="text-right">
                {member.hasPrediction ? (
                  <>
                    <div
                      className="text-lg font-bold"
                      style={{
                        fontFamily: "var(--font-display)",
                        color:
                          member.totalScore > 0
                            ? "var(--field)"
                            : member.totalScore < 0
                              ? "var(--stitch)"
                              : "var(--text-primary)",
                      }}
                    >
                      {member.totalScore > 0 ? "+" : ""}
                      {member.totalScore}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      C:{member.centralScore} / P:{member.pacificScore}
                    </div>
                  </>
                ) : (
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    未予想
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction matrix comparison */}
      {scoreboard.some((s) => s.hasPrediction) && (
        <>
          {/* League tabs + PNG button */}
          <div className="flex items-end gap-0">
            {(["central", "pacific"] as const).map((l) => {
              const active = l === league;
              const color =
                l === "central" ? "var(--central)" : "var(--pacific)";
              return (
                <button
                  key={l}
                  onClick={() => setLeague(l)}
                  className="px-5 py-2.5 text-sm font-bold"
                  style={{
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    color: active ? "#fff" : "var(--text-muted)",
                    background: active ? color : "var(--bg-surface)",
                    borderBottom: active
                      ? `3px solid ${color}`
                      : "3px solid var(--border-primary)",
                  }}
                >
                  {l === "central" ? "セ・リーグ" : "パ・リーグ"}
                </button>
              );
            })}
            <div
              className="flex flex-1 items-center justify-end pb-1"
              style={{ borderBottom: "3px solid var(--border-primary)" }}
            >
              <button
                onClick={() => {
                  const withPreds = scoreboard.filter((m) => m.hasPrediction);
                  const cols = withPreds.map((m) => ({
                    name: m.name,
                    picks: (league === "central" ? m.centralPicks : m.pacificPicks).map(
                      (p) => ({ rank: p.rank, teamName: p.teamName })
                    ),
                  }));
                  downloadPredictionPng(
                    cols,
                    league,
                    `${group.name} — ${season?.year ?? ""} 予想比較`
                  );
                }}
                className="mr-2 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.06em",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v8M5 7l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" />
                </svg>
                PNG
              </button>
            </div>
          </div>

          {/* Matrix table */}
          <div className="card overflow-x-auto rounded-lg">
            <table
              className="w-full"
              style={{ borderCollapse: "separate", borderSpacing: 0 }}
            >
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
                    メンバー
                  </th>
                  {[1, 2, 3, 4, 5, 6].map((rank) => (
                    <th
                      key={rank}
                      className="px-1 py-2.5 text-center"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "0.9rem",
                        color:
                          rank === 1 ? "var(--dirt)" : "var(--text-muted)",
                        background: "var(--bg-inset)",
                        borderBottom: "2px solid var(--border-primary)",
                        minWidth: "5rem",
                      }}
                    >
                      {rank}位
                    </th>
                  ))}
                  <th
                    className="px-2 py-2.5 text-center"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      background: "var(--bg-inset)",
                      borderBottom: "2px solid var(--border-primary)",
                    }}
                  >
                    SCORE
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankedBoard
                  .filter((m) => m.hasPrediction)
                  .map((member, idx) => {
                    const picks =
                      league === "central"
                        ? member.centralPicks
                        : member.pacificPicks;
                    const leagueScore =
                      league === "central"
                        ? member.centralScore
                        : member.pacificScore;

                    return (
                      <tr
                        key={member.userId}
                        style={{
                          borderBottom: "1px solid var(--border-primary)",
                          background:
                            idx % 2 === 0
                              ? "var(--bg-surface)"
                              : "var(--bg-elevated)",
                        }}
                      >
                        <td
                          className="sticky left-0 z-10 px-3 py-1.5"
                          style={{
                            background:
                              idx % 2 === 0
                                ? "var(--bg-surface)"
                                : "var(--bg-elevated)",
                            borderRight: "1px solid var(--border-primary)",
                          }}
                        >
                          <div
                            className="text-xs font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {member.name}
                          </div>
                        </td>
                        {[1, 2, 3, 4, 5, 6].map((rank) => {
                          const pick = picks.find((p) => p.rank === rank);
                          const team = pick
                            ? getTeamByName(pick.teamName)
                            : null;
                          return (
                            <td key={rank} className="p-0.5">
                              {team ? (
                                <div
                                  className="flex items-center justify-center rounded-sm py-1.5 text-xs font-bold"
                                  style={{
                                    background: team.color,
                                    color: team.textColor,
                                    textShadow:
                                      team.textColor === "#fff"
                                        ? "0 1px 2px rgba(0,0,0,0.3)"
                                        : "none",
                                  }}
                                >
                                  {team.shortName}
                                </div>
                              ) : (
                                <div
                                  className="flex items-center justify-center rounded-sm py-1.5 text-xs"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  --
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5 text-center">
                          <span
                            className="text-sm font-bold"
                            style={{
                              fontFamily: "var(--font-display)",
                              color:
                                leagueScore > 0
                                  ? "var(--field)"
                                  : leagueScore < 0
                                    ? "var(--stitch)"
                                    : "var(--text-primary)",
                            }}
                          >
                            {leagueScore > 0 ? "+" : ""}
                            {leagueScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Share section */}
      {!firebaseUser && (
        <div className="card rounded-lg p-6 text-center">
          <p style={{ color: "var(--text-secondary)" }}>
            このグループに参加するにはログインが必要です
          </p>
          <button
            onClick={signIn}
            className="mt-3 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "var(--stitch)" }}
          >
            Googleでログイン
          </button>
        </div>
      )}
    </div>
  );
}
