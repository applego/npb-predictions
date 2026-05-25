export const runtime = "edge";

import type { Metadata } from "next";
import { getDb } from "@/db";
import { actualTitleSnapshots, seasons } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { canonicalAlternates, clampDescription, socialPreview, SEO_TERMS } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: "2026 タイトル速報",
  description: clampDescription(
    `2026年${SEO_TERMS.npbFull}シーズンのタイトル（打率・本塁打・打点・勝利・防御率・セーブ）を自動スクレイプで表示。`,
  ),
  alternates: canonicalAlternates("/rankings/titles"),
  ...socialPreview({
    title: "2026 タイトル速報 | NPB予想リーグ",
    description: "セ・パ各タイトル1位をリアルタイム表示",
    pathname: "/rankings/titles",
  }),
};

const CATEGORY_LABEL: Record<string, string> = {
  batting_avg: "首位打者",
  home_runs: "本塁打王",
  rbi: "打点王",
  wins: "最多勝",
  era: "最優秀防御率",
  saves: "最多セーブ",
};

const CATEGORY_SUFFIX: Record<string, string> = {
  batting_avg: "",
  home_runs: "本",
  rbi: "点",
  wins: "勝",
  era: "",
  saves: "S",
};

function formatValue(category: string, value: number | null): string {
  if (value === null) return "—";
  if (category === "batting_avg") return value.toFixed(3).replace(/^0/, "");
  if (category === "era") return value.toFixed(2);
  return String(value);
}

const CATEGORY_ORDER = ["batting_avg", "home_runs", "rbi", "wins", "era", "saves"];

export default async function TitlesPage() {
  const db = getDb();

  const activeSeason = (
    await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1)
  )[0];

  if (!activeSeason) {
    return <div className="text-[var(--text-secondary)]">アクティブなシーズンがありません。</div>;
  }

  // Fetch latest snapshot per (league, category)
  const allSnapshots = await db
    .select()
    .from(actualTitleSnapshots)
    .where(eq(actualTitleSnapshots.seasonId, activeSeason.id))
    .orderBy(desc(actualTitleSnapshots.snapshotDate));

  type Snap = (typeof allSnapshots)[number];
  const latestByKey = new Map<string, Snap>();
  for (const s of allSnapshots) {
    const key = `${s.league}:${s.category}`;
    if (!latestByKey.has(key)) latestByKey.set(key, s);
  }

  const hasData = latestByKey.size > 0;
  const latestUpdate = allSnapshots[0]?.snapshotDate;

  const renderColumn = (league: "central" | "pacific") => (
    <div
      key={league}
      className="rounded-lg"
      style={{
        border: "1px solid var(--border-primary)",
        background: "var(--surface-card)",
      }}
    >
      <div
        className="px-4 py-2 font-bold text-sm tracking-wide"
        style={{
          borderBottom: "1px solid var(--border-primary)",
          background: league === "central" ? "rgba(21,101,192,0.08)" : "rgba(0,105,92,0.08)",
          color: league === "central" ? "#1565C0" : "#00695C",
        }}
      >
        {league === "central" ? "セントラル" : "パシフィック"}
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
        {CATEGORY_ORDER.map((cat) => {
          const snap = latestByKey.get(`${league}:${cat}`);
          return (
            <div
              key={cat}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <div className="w-24 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                {CATEGORY_LABEL[cat]}
              </div>
              {snap ? (
                <>
                  <div className="flex-1 font-semibold">{snap.playerName}</div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {snap.teamName}
                  </div>
                  <div
                    className="font-bold text-lg"
                    style={{ color: "var(--stitch)", minWidth: "4rem", textAlign: "right" }}
                  >
                    {formatValue(cat, snap.value)}
                    <span className="text-xs ml-0.5">{CATEGORY_SUFFIX[cat]}</span>
                  </div>
                </>
              ) : (
                <div className="flex-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  実績データ待ち
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{activeSeason.year} タイトル速報</h1>
        {latestUpdate && (
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            最終更新 {new Date(latestUpdate).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
          </div>
        )}
      </div>

      {!hasData && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            border: "1px dashed var(--border-primary)",
            background: "rgba(0,0,0,0.02)",
            color: "var(--text-secondary)",
          }}
        >
          タイトル実績はシーズン進行に合わせて更新されます。もうしばらくお待ちください。
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {renderColumn("central")}
        {renderColumn("pacific")}
      </div>
    </div>
  );
}
