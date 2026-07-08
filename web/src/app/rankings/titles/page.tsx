export const runtime = "edge";

import type { Metadata } from "next";
import { BroadcastBand, BroadcastHeading, BroadcastPanel, BroadcastChip } from "@/components/BroadcastShell";
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
import { scoreTitlePredictors } from "@/lib/title-accuracy";

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

  const predictorInputs: Predictor[] = [...predictorMeta.entries()].map(([predictionId, meta]) => {
    const picks = picksByPred.get(predictionId) ?? new Map();
    return {
      predictionId,
      name: meta.name,
      source: meta.source,
      picks,
    };
  });
  const predictors = scoreTitlePredictors(
    predictorInputs,
    actualByKey,
    confirmedKeys,
  );
  predictors.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const confirmedCount = confirmedKeys.length;
  const hasPredictors = predictors.length > 0;

  return (
    <div className="space-y-6">
      <BroadcastBand year={activeSeason.year} />

      <BroadcastHeading kicker="TITLE PREDICTIONS" title="タイトル予想 的中率">
        <p>
          確定 {confirmedCount} タイトル ／ タイトル予想者 {predictors.length}人
        </p>
      </BroadcastHeading>

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
          <BroadcastPanel key={lg.id} className="overflow-hidden">
            <div className="flex gap-2 border-b px-3 py-3" style={{ borderColor: "var(--border-primary)" }}>
              <BroadcastChip active>{lg.label}</BroadcastChip>
            </div>
            <div
              className="max-w-full overflow-x-auto"
              style={{ borderTop: "none" }}
            >
              <table
                className="w-full"
                style={{
                  borderCollapse: "collapse",
                  minWidth: `${13 + predictors.length * 7}rem`,
                }}
              >
                <thead>
                  <tr style={{ background: "var(--bg-inset)", borderBottom: "2px solid var(--text-primary)" }}>
                    <th
                      className="px-3 py-2 text-left text-xs"
                        style={{ color: "var(--text-muted)", minWidth: "6rem", background: "var(--bg-inset)" }}
                    >
                      タイトル
                    </th>
                    <th
                      className="px-3 py-2 text-left text-xs"
                      style={{
                        color: "var(--dirt)",
                        borderLeft: "1px solid var(--border-primary)",
                        minWidth: "7rem",
                        background: "var(--bg-inset)",
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
                          background: "var(--bg-inset)",
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
                            background: confirmed ? "rgba(138,90,0,0.08)" : "transparent",
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
                              style={{
                                borderLeft: "1px solid var(--border-primary)",
                                background: hit ? "rgba(31,122,63,0.1)" : confirmed && pick ? "rgba(207,58,50,0.045)" : "transparent",
                              }}
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
          </BroadcastPanel>
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
                  {p.hits}/{p.attemptedConfirmedCount} 的中
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
