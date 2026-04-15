"use client";

/* eslint-disable @next/next/no-img-element */
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import PredictionImageGenerator from "@/components/PredictionImageGenerator";
import { generateArticleV2, type ArticleVarsV2 } from "@/lib/article-templates-v2";

// ── Types ──

interface YearScore {
  year: number;
  centralScore: number;
  pacificScore: number;
  totalScore: number;
  deviation: number | null;
}

interface AllTimeEntry {
  userId: number;
  name: string;
  slug: string;
  yearsCount: number;
  years: YearScore[];
  allTimeTotal: number;
  avgPerYear: number;
  bestScore: number;
  bestYear: number | null;
  rank: number;
}

interface GroupEntry {
  id: number;
  name: string;
  slug: string;
  memberCount: number;
}

interface RankingPick {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
}

interface SeasonEntry {
  id: number;
  year: number;
}

// ── Component ──

export default function MyPage() {
  const { firebaseUser, appUser, loading } = useAuth();

  const [allTimeData, setAllTimeData] = useState<AllTimeEntry | null>(null);
  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [predictions, setPredictions] = useState<
    Map<number, { central: string[]; pacific: string[] }>
  >(new Map());
  const [seasons, setSeasons] = useState<SeasonEntry[]>([]);
  const [fetching, setFetching] = useState(true);

  // Fetch all data once user is loaded
  useEffect(() => {
    if (!appUser || !firebaseUser) {
      setFetching(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      try {
        const [allTimeRes, groupsRes, seasonsRes] = await Promise.all([
          fetch("/api/rankings/all-time"),
          fetch(`/api/groups/my?firebaseUid=${firebaseUser!.uid}`),
          fetch("/api/seasons"),
        ]);

        if (cancelled) return;

        // All-time data
        if (allTimeRes.ok) {
          const data = (await allTimeRes.json()) as {
            commentators: AllTimeEntry[];
          };
          const me = data.commentators.find(
            (c) => c.userId === appUser!.id,
          );
          if (me) setAllTimeData(me);
        }

        // Groups
        if (groupsRes.ok) {
          const data = (await groupsRes.json()) as {
            groups?: GroupEntry[];
          };
          setGroups(data.groups ?? []);
        }

        // Seasons + predictions
        if (seasonsRes.ok) {
          const seasonsData = (await seasonsRes.json()) as SeasonEntry[];
          setSeasons(seasonsData);

          // Fetch predictions for each season via /api/seasons/[year]/users/[userId]
          const predMap = new Map<
            number,
            { central: string[]; pacific: string[] }
          >();

          interface PredictionResponse {
            rankingPicks?: RankingPick[];
          }

          const predResults = await Promise.all(
            seasonsData.map((s) =>
              fetch(
                `/api/seasons/${s.year}/users/${appUser!.id}`,
              ).then((r) =>
                r.ok ? (r.json() as Promise<PredictionResponse>) : null,
              ),
            ),
          );

          for (let i = 0; i < seasonsData.length; i++) {
            const result = predResults[i];
            if (!result?.rankingPicks || result.rankingPicks.length === 0) continue;
            const central = result.rankingPicks
              .filter((p) => p.league === "central")
              .sort((a, b) => a.rank - b.rank)
              .map((p) => p.teamName);
            const pacific = result.rankingPicks
              .filter((p) => p.league === "pacific")
              .sort((a, b) => a.rank - b.rank)
              .map((p) => p.teamName);
            predMap.set(seasonsData[i].year, { central, pacific });
          }
          setPredictions(predMap);
        }
      } catch (err) {
        console.error("Failed to load my page data:", err);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [appUser, firebaseUser]);

  // Loading state
  if (loading || fetching) {
    return (
      <div className="animate-pulse space-y-6">
        <div
          className="h-20 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        />
        <div
          className="h-48 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        />
        <div
          className="h-32 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)",
          }}
        />
      </div>
    );
  }

  // Not logged in
  if (!firebaseUser) {
    return <LoginPrompt />;
  }

  const displayName =
    appUser?.name ?? firebaseUser.displayName ?? "User";
  const avatarUrl =
    appUser?.avatarUrl ?? firebaseUser.photoURL ?? undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Profile Header */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "2px solid var(--border-primary)",
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(229,57,53,0.1)",
                color: "var(--stitch)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {displayName}
            </h1>
            {allTimeData && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-muted)",
                  margin: "0.25rem 0 0",
                }}
              >
                {allTimeData.yearsCount}年参加
                {" | "}
                通算{allTimeData.allTimeTotal > 0 ? "+" : ""}
                {allTimeData.allTimeTotal}
                {allTimeData.bestYear && (
                  <>
                    {" | "}
                    最高{allTimeData.bestScore > 0 ? "+" : ""}
                    {allTimeData.bestScore}({allTimeData.bestYear})
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Score Trend */}
      {allTimeData && allTimeData.years.length > 0 && (
        <ScoreTrendCard years={allTimeData.years} />
      )}

      {/* My Predictions */}
      <PredictionsCard
        predictions={predictions}
        seasons={seasons}
        userName={displayName}
        userId={appUser?.id ?? 0}
      />

      {/* My Groups */}
      {groups.length > 0 && <GroupsCard groups={groups} />}
    </div>
  );
}

// ── Login Prompt ──

function LoginPrompt() {
  const { signIn } = useAuth();
  return (
    <div
      className="card"
      style={{
        padding: "3rem 1.5rem",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "1rem",
          color: "var(--text-secondary)",
          marginBottom: "1.5rem",
        }}
      >
        マイページを表示するにはログインが必要です
      </p>
      <button
        onClick={signIn}
        style={{
          background: "var(--stitch)",
          color: "#fff",
          border: "none",
          borderRadius: "0.375rem",
          padding: "0.625rem 1.5rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Googleでログイン
      </button>
    </div>
  );
}

// ── Score Trend Card ──

function ScoreTrendCard({ years }: { years: YearScore[] }) {
  const maxAbs = Math.max(
    ...years.map((y) => Math.abs(y.totalScore)),
    1,
  );

  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
      <h2
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          letterSpacing: "0.12em",
          marginBottom: "1rem",
          fontFamily: "var(--font-display)",
        }}
      >
        SCORE TREND
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {years.map((y) => {
          const isPositive = y.totalScore >= 0;
          const pct = Math.min(
            (Math.abs(y.totalScore) / maxAbs) * 100,
            100,
          );

          return (
            <div
              key={y.year}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  minWidth: "2.5rem",
                  textAlign: "right",
                  fontFamily: "var(--font-display)",
                }}
              >
                {y.year}
              </span>
              <div
                style={{
                  flex: 1,
                  height: "1.25rem",
                  background: "var(--bg-inset)",
                  borderRadius: "0.25rem",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(pct, 3)}%`,
                    height: "100%",
                    background: isPositive
                      ? "var(--stitch)"
                      : "var(--text-muted)",
                    borderRadius: "0.25rem",
                    opacity: isPositive ? 0.8 : 0.4,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: isPositive
                    ? "var(--stitch)"
                    : "var(--text-muted)",
                  minWidth: "3rem",
                  textAlign: "right",
                  fontFamily: "var(--font-display)",
                }}
              >
                {y.totalScore > 0 ? "+" : ""}
                {y.totalScore}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Predictions Card ──

function PredictionsCard({
  predictions,
  seasons,
  userName,
  userId,
}: {
  predictions: Map<number, { central: string[]; pacific: string[] }>;
  seasons: SeasonEntry[];
  userName: string;
  userId: number;
}) {
  const [imageYear, setImageYear] = useState<number | null>(null);

  // Sort seasons descending
  const sortedSeasons = useMemo(
    () => [...seasons].sort((a, b) => b.year - a.year),
    [seasons],
  );

  // Generate article for image
  const articleForYear = useMemo(() => {
    if (!imageYear) return null;
    const picks = predictions.get(imageYear);
    if (!picks || picks.central.length === 0) return null;

    const vars: ArticleVarsV2 = {
      name: userName,
      year: imageYear,
      central1: picks.central[0] ?? "",
      pacific1: picks.pacific[0] ?? "",
      boldness: "勝負師",
      timing: "参戦中",
      timingBonus: "x1.0",
      consensus: "独自路線",
      popularPick: picks.central[0] ?? "",
      popularPct: 30,
      lastYearC1: "",
      lastYearP1: "",
      c1LastRank: 3,
      daysContext: "",
      month: new Date().getMonth() + 1,
    };
    return generateArticleV2(userId, vars);
  }, [imageYear, predictions, userName, userId]);

  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
      <h2
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          letterSpacing: "0.12em",
          marginBottom: "1rem",
          fontFamily: "var(--font-display)",
        }}
      >
        MY PREDICTIONS
      </h2>

      {sortedSeasons.length === 0 && (
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          まだ予想がありません
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {sortedSeasons.map((s) => {
          const picks = predictions.get(s.year);
          if (!picks) return null;

          return (
            <div key={s.year}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {s.year}
                </span>
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <LeagueLabel label="セ" />
                  {" "}
                  {picks.central.join(" > ")}
                </span>
              </div>
              <div
                style={{
                  marginTop: "0.25rem",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ minWidth: "2rem" }} />
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <LeagueLabel label="パ" />
                  {" "}
                  {picks.pacific.join(" > ")}
                </span>
              </div>

              {/* Image generation button */}
              <div style={{ marginTop: "0.5rem" }}>
                {imageYear === s.year && articleForYear ? (
                  <PredictionImageGenerator
                    userName={userName}
                    year={s.year}
                    centralPicks={picks.central}
                    pacificPicks={picks.pacific}
                    article={{
                      headline: articleForYear.headline,
                      subtext: articleForYear.subtext,
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setImageYear(s.year)}
                    style={{
                      background: "transparent",
                      color: "var(--stitch)",
                      border: "1px solid var(--stitch)",
                      borderRadius: "0.375rem",
                      padding: "0.375rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    画像を生成する
                  </button>
                )}
              </div>

              {/* Divider between years */}
              <div
                className="bat-divider"
                style={{ marginTop: "0.75rem" }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Groups Card ──

function GroupsCard({ groups }: { groups: GroupEntry[] }) {
  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
      <h2
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          letterSpacing: "0.12em",
          marginBottom: "1rem",
          fontFamily: "var(--font-display)",
        }}
      >
        MY GROUPS
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.625rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid var(--border-primary)",
              textDecoration: "none",
              color: "var(--text-primary)",
              transition: "box-shadow 0.15s",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                {g.name}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginLeft: "0.5rem",
                }}
              >
                ({g.memberCount}人)
              </span>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--stitch)",
                fontWeight: 600,
              }}
            >
              グループを見る
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── League label badge ──

function LeagueLabel({ label }: { label: string }) {
  const isC = label === "セ";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.6875rem",
        fontWeight: 700,
        color: "#fff",
        background: isC ? "var(--central)" : "var(--pacific)",
        borderRadius: "0.25rem",
        padding: "0.0625rem 0.375rem",
        lineHeight: 1.4,
      }}
    >
      {label}
    </span>
  );
}
