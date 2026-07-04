export const runtime = "edge";

import type { Metadata } from "next";
import { getDb } from "@/db";
import {
  seasons,
  predictions,
  titlePicks,
  actualTitleSnapshots,
  users,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getTeamByName } from "@/lib/teams";
import {
  canonicalAlternates,
  clampDescription,
  socialPreview,
  SEO_TERMS,
} from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: "タイトル予想 的中率",
  description: clampDescription(
    `${SEO_TERMS.npbFull}の個人タイトル予想を、実際の結果と突き合わせて的中率で比較。首位打者・本塁打王・打点王ほか、誰が当てたかを一覧で確認できます。`,
  ),
  alternates: canonicalAlternates("/rankings/titles"),
  ...socialPreview({
    title: "タイトル予想 的中率 | NPB予想リーグ",
    description: "個人タイトル予想の的中率を実際の結果と比較",
    pathname: "/rankings/titles",
  }),
};

const CATEGORY_LABEL: Record<string, string> = {
  batting_avg: "首位打者",
  home_runs: "本塁打王",
  rbi: "打点王",
  wins: "最多勝",
  era: "防御率",
  saves: "最多セーブ",
};
const CATEGORY_ORDER = ["batting_avg", "home_runs", "rbi", "wins", "era", "saves"];
const LEAGUES: { id: "central" | "pacific"; label: string }[] = [
  { id: "central", label: "セ・リーグ" },
  { id: "pacific", label: "パ・リーグ" },
];
const TITLE_HIT_SCORE = 3;
const HIT_GREEN = "#16A34A";
const MISS_RED = "#DC2626";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function TeamChip({ teamName }: { teamName: string | null }) {
  if (!teamName) return null;
  const team = getTeamByName(teamName);
  if (!team) return null;
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-sm"
      style={{
        width: "1.05rem",
        height: "1.05rem",
        fontSize: "0.5rem",
        fontWeight: 700,
        background: team.color,
        color: team.textColor,
        textShadow: team.textColor === "#fff" ? "0 1px 1px rgba(0,0,0,0.3)" : "none",
      }}
      title={team.name}
    >
      {team.shortName.slice(0, 2)}
    </span>
  );
}

interface Predictor {
  predictionId: number;
  name: string;
  source: string | null;
  picks: Map<string, { playerName: string; teamName: string | null }>;
  hits: number;
  score: number;
}

export default async function TitlesPage() {
  const db = getDb();

  const activeSeason = (
    await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1)
  )[0];

  if (!activeSeason) {
    return (
      <div style={{ color: "var(--text-secondary)" }}>
        アクティブなシーズンがありません。
      </div>
    );
  }

  // Latest actual title per (league, category)
  const allSnapshots = await db
    .select()
    .from(actualTitleSnapshots)
    .where(eq(actualTitleSnapshots.seasonId, activeSeason.id))
    .orderBy(desc(actualTitleSnapshots.snapshotDate));
  type Snap = (typeof allSnapshots)[number];
  const actualByKey = new Map<string, Snap>();
  for (const s of allSnapshots) {
    const key = `${s.league}:${s.category}`;
    if (!actualByKey.has(key)) actualByKey.set(key, s);
  }

  // Friend predictors + their title picks. Keep the season/user-role filter in
  // SQLite so edge rendering does not scan every historical title pick.
  const friendRows = await db
    .select({
      predictionId: predictions.id,
      userName: users.name,
      userSource: users.source,
      league: titlePicks.league,
      category: titlePicks.category,
      playerName: titlePicks.playerName,
      teamName: titlePicks.teamName,
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .leftJoin(titlePicks, eq(titlePicks.predictionId, predictions.id))
    .where(and(eq(predictions.seasonId, activeSeason.id), eq(users.role, "friend")));

  const picksByPred = new Map<number, Map<string, { playerName: string; teamName: string | null }>>();
  const predictorMeta = new Map<number, { name: string; source: string | null }>();
  for (const row of friendRows) {
    predictorMeta.set(row.predictionId, {
      name: row.userName,
      source: row.userSource,
    });
    if (!row.league || !row.category || !row.playerName) continue;
    const picks = picksByPred.get(row.predictionId) ?? new Map();
    picks.set(`${row.league}:${row.category}`, {
      playerName: row.playerName,
      teamName: row.teamName,
    });
    picksByPred.set(row.predictionId, picks);
  }

  // Confirmed (isFinal) title keys across both leagues
  const confirmedKeys: string[] = [];
  for (const lg of LEAGUES) {
    for (const cat of CATEGORY_ORDER) {
      const snap = actualByKey.get(`${lg.id}:${cat}`);
      if (snap?.isFinal) confirmedKeys.push(`${lg.id}:${cat}`);
    }
  }

  const predictors: Predictor[] = [...predictorMeta.entries()].map(([predictionId, meta]) => {
    const picks = picksByPred.get(predictionId) ?? new Map();
    let hits = 0;
    for (const key of confirmedKeys) {
      const actual = actualByKey.get(key);
      const pick = picks.get(key);
      if (actual && pick && norm(pick.playerName) === norm(actual.playerName)) {
        hits += 1;
      }
    }
    return {
      predictionId,
      name: meta.name,
      source: meta.source,
      picks,
      hits,
      score: hits * TITLE_HIT_SCORE,
    };
  });
  predictors.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const confirmedCount = confirmedKeys.length;
  const hasPredictors = predictors.length > 0;

  return (
    <div className="space-y-6">
      {/* Broadcast header band */}
      <div
        className="flex items-center justify-between rounded-md px-4 py-3"
        style={{ background: "var(--border-strong)", color: "#fff" }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            letterSpacing: "0.12em",
          }}
        >
          NPB PREDICTIONS
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.8rem",
            letterSpacing: "0.16em",
            opacity: 0.8,
          }}
        >
          {activeSeason.year} SEASON
        </span>
      </div>

      <div>
        <p
          className="text-[0.7rem]"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "0.2em",
            color: "var(--stitch)",
          }}
        >
          TITLE PREDICTIONS
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            letterSpacing: "0.03em",
            color: "var(--text-primary)",
          }}
        >
          タイトル予想 的中率
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          確定 {confirmedCount} タイトル ／ 予想者 {predictors.length}人
        </p>
      </div>

      {!hasPredictors && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            border: "1px dashed var(--border-primary)",
            color: "var(--text-secondary)",
          }}
        >
          タイトル予想データがまだありません。
        </div>
      )}

      {/* Per-league accuracy tables */}
      {hasPredictors &&
        LEAGUES.map((lg) => (
          <section key={lg.id}>
            <div
              className="rounded-t-md px-3 py-1.5 text-sm font-bold"
              style={{
                background: lg.id === "central" ? "var(--central)" : "var(--pacific)",
                color: "#fff",
                letterSpacing: "0.08em",
              }}
            >
              {lg.label}
            </div>
            <div
              className="overflow-x-auto rounded-b-md"
              style={{ border: "1px solid var(--border-primary)", borderTop: "none" }}
            >
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-inset)" }}>
                    <th
                      className="px-3 py-2 text-left text-xs"
                      style={{ color: "var(--text-muted)", minWidth: "6rem" }}
                    >
                      タイトル
                    </th>
                    <th
                      className="px-3 py-2 text-left text-xs"
                      style={{
                        color: "var(--text-primary)",
                        borderLeft: "1px solid var(--border-primary)",
                        minWidth: "7rem",
                      }}
                    >
                      実際の結果
                    </th>
                    {predictors.map((p) => (
                      <th
                        key={p.predictionId}
                        className="px-3 py-2 text-center text-xs"
                        style={{
                          color: "var(--text-muted)",
                          borderLeft: "1px solid var(--border-primary)",
                          minWidth: "7rem",
                        }}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORY_ORDER.map((cat) => {
                    const key = `${lg.id}:${cat}`;
                    const actual = actualByKey.get(key);
                    const confirmed = actual?.isFinal === true;
                    return (
                      <tr
                        key={cat}
                        style={{ borderTop: "1px solid var(--border-primary)" }}
                      >
                        {/* Category */}
                        <td className="px-3 py-2.5">
                          <div
                            className="text-xs font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {CATEGORY_LABEL[cat]}
                          </div>
                          <div
                            className="text-[10px]"
                            style={{
                              fontFamily: "var(--font-display)",
                              letterSpacing: "0.08em",
                              color: confirmed ? "var(--field)" : "var(--text-muted)",
                            }}
                          >
                            {confirmed ? "確定" : "未確定"}
                          </div>
                        </td>
                        {/* Actual result */}
                        <td
                          className="px-3 py-2.5"
                          style={{
                            borderLeft: "1px solid var(--border-primary)",
                            background: confirmed ? "var(--bg-elevated)" : "transparent",
                          }}
                        >
                          {actual ? (
                            <div className="flex items-center gap-1.5">
                              <TeamChip teamName={actual.teamName} />
                              <span
                                className="text-xs font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {actual.playerName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              未確定
                            </span>
                          )}
                        </td>
                        {/* Each predictor's pick */}
                        {predictors.map((p) => {
                          const pick = p.picks.get(key);
                          const hit =
                            confirmed &&
                            pick &&
                            actual &&
                            norm(pick.playerName) === norm(actual.playerName);
                          return (
                            <td
                              key={p.predictionId}
                              className="px-3 py-2.5"
                              style={{ borderLeft: "1px solid var(--border-primary)" }}
                            >
                              {pick ? (
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="flex items-center gap-1 truncate">
                                    <TeamChip teamName={pick.teamName} />
                                    <span
                                      className="truncate text-xs"
                                      style={{ color: "var(--text-secondary)" }}
                                    >
                                      {pick.playerName}
                                    </span>
                                  </span>
                                  {confirmed && (
                                    <span
                                      className="flex-none text-xs font-bold"
                                      style={{ color: hit ? HIT_GREEN : MISS_RED }}
                                    >
                                      {hit ? "✓" : "✗"}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  —
                                </span>
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
          </section>
        ))}

      {/* TITLE SCORE cards */}
      {hasPredictors && (
        <section>
          <p
            className="mb-2 text-[0.7rem]"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
            }}
          >
            TITLE SCORE ・ 確定{confirmedCount}タイトル
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {predictors.map((p, i) => (
              <div
                key={p.predictionId}
                className="rounded-md px-3 py-3 text-center"
                style={{
                  background: "var(--bg-surface)",
                  border:
                    i === 0
                      ? "2px solid var(--stitch)"
                      : "1px solid var(--border-primary)",
                }}
              >
                <div className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.75rem",
                    lineHeight: 1.1,
                    color: p.score > 0 ? "var(--field)" : "var(--text-muted)",
                  }}
                >
                  +{p.score}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {p.hits}/{confirmedCount} 的中
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
