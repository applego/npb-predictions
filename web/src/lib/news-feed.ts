import { getDb } from "@/db";
import {
  users,
  seasons,
  predictions,
  rankingPicks,
  scoreSnapshots,
  actualTeamStandings,
} from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { calcRankingPointForTeam } from "@/lib/scoring";
import { generateFullArticle, buildArticleVars } from "@/lib/article-templates-v3";

export interface NewsItem {
  id: string;
  type: "hit" | "ranking" | "prediction" | "spotlight";
  title: string;
  body: string;
  commentator?: string;
  year?: number;
  timestamp: number;
  icon: string;
  source?: string;
  /** Newspaper-style headline */
  headline?: string;
  /** Lead paragraph */
  lead?: string;
  /** Body paragraphs */
  bodyParagraphs?: string[];
  /** Quote */
  quote?: string;
  /** Central league picks [1st, 2nd, ...] */
  centralPicks?: string[];
  /** Pacific league picks [1st, 2nd, ...] */
  pacificPicks?: string[];
}

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

const LEAGUE_LABELS: Record<string, string> = {
  central: "セ・リーグ",
  pacific: "パ・リーグ",
};

export async function generateNewsFeed(limit = 50): Promise<NewsItem[]> {
  const db = getDb();
  const newsItems: NewsItem[] = [];

  // Seasons are walked newest-first and each one is loaded on demand: every
  // item's timestamp is `year * 10_000_000 + …`, so once `limit` items exist,
  // no older season can reach the result. Reading every season's picks and
  // score snapshots per request used to burn ~60k D1 rows. Each season's four
  // queries go out as one batch to stay under the Workers subrequest limit.
  const [allSeasons, allUsers] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.year)),
    db.select().from(users),
  ]);

  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const seenIds = new Set<string>();
  const spotlightItems: NewsItem[] = [];

  for (const season of allSeasons) {
    if (seenIds.size >= limit) break;
    const seasonStart = newsItems.length;
    const spotlightStart = spotlightItems.length;
    const lockedInSeason = and(eq(predictions.seasonId, season.id), eq(predictions.isLocked, true));
    const [seasonStandings, seasonPredictions, allPicks, seasonBestScores] = await db.batch([
      db.select().from(actualTeamStandings).where(eq(actualTeamStandings.seasonId, season.id)).orderBy(desc(actualTeamStandings.snapshotDate)),
      db.select().from(predictions).where(lockedInSeason).orderBy(desc(predictions.createdAt), predictions.id),
      db.select().from(rankingPicks)
        .where(inArray(rankingPicks.predictionId, db.select({ id: predictions.id }).from(predictions).where(lockedInSeason)))
        .orderBy(rankingPicks.id),
      // Every snapshot owner's best total score in this season. The recursive
      // CTE hops user ids through score_snapshots_season_user_total_idx and the
      // correlated MAX is one probe per user, instead of reading every daily
      // snapshot. Aliases are explicit because drizzle drops table qualifiers
      // inside sql``, which would turn the correlation into `user_id = user_id`.
      db.select({
        userId: sql<number>`u.id`,
        best: sql<number | null>`(select max(ss.total_score) from score_snapshots ss where ss.season_id = ${season.id} and ss.user_id = u.id)`,
      }).from(sql`(with recursive u(id) as (
          select (select min(ss.user_id) from score_snapshots ss where ss.season_id = ${season.id})
          union all
          select (select min(ss.user_id) from score_snapshots ss where ss.season_id = ${season.id} and ss.user_id > u.id) from u where u.id is not null
        ) select id from u where id is not null) u`),
    ]);

    const picksByPredId = new Map<number, typeof allPicks>();
    for (const rp of allPicks) {
      const arr = picksByPredId.get(rp.predictionId) ?? [];
      arr.push(rp);
      picksByPredId.set(rp.predictionId, arr);
    }
    const bestByUser = new Map<number, number>();
    for (const row of seasonBestScores) if (row.best !== null) bestByUser.set(row.userId, Number(row.best));
    const bestScoreFor = (userId: number) => bestByUser.get(userId) ?? -Infinity;

    // ── 1. 的中速報 (hit) ──
    const standingsMap = new Map<string, { league: string; rank: number; teamName: string }>();
    for (const row of seasonStandings) {
      const key = `${row.league}:${row.rank}`;
      if (!standingsMap.has(key)) {
        standingsMap.set(key, { league: row.league, rank: row.rank, teamName: row.teamName });
      }
    }

    const actualRankByLeague = new Map<string, Map<string, number>>();
    for (const s of standingsMap.values()) {
      if (!actualRankByLeague.has(s.league)) actualRankByLeague.set(s.league, new Map());
      actualRankByLeague.get(s.league)!.set(s.teamName, s.rank);
    }

    if (standingsMap.size > 0) {
      const predIds = seasonPredictions.map((p) => p.id);

      if (predIds.length > 0) {
        const predIdSet = new Set(predIds);
        const relevantPicks = allPicks.filter((rp) => predIdSet.has(rp.predictionId));
        const predUserMap = new Map(seasonPredictions.map((p) => [p.id, p.userId]));

        for (const pick of relevantPicks) {
          const leagueRanks = actualRankByLeague.get(pick.league);
          if (!leagueRanks) continue;

          const actualRank = leagueRanks.get(pick.teamName);
          if (actualRank === undefined) continue;

          if (pick.rank === actualRank) {
            const userId = predUserMap.get(pick.predictionId);
            const user = userId ? userMap.get(userId) : undefined;
            if (!user) continue;

            const score = calcRankingPointForTeam(pick.rank, actualRank);
            const leagueLabel = LEAGUE_LABELS[pick.league] ?? pick.league;

            newsItems.push({
              id: `hit-${season.year}-${user.id}-${pick.league}-${pick.rank}`,
              type: "hit",
              title: `${user.name}が${season.year}年${leagueLabel}${pick.rank}位(${pick.teamName})を的中！`,
              body: `順位予想が完全一致。${fmtScore(score)}点獲得。`,
              commentator: user.name,
              year: season.year,
              timestamp: season.year * 10000000 + pick.rank,
              icon: "🎯",
            });
          }
        }
      }
    }

    // ── 2. ランキング変動 (ranking) ──
    // Users ordered by their best total score of the season (ties: lower id).
    const topScores = [...bestByUser]
      .map(([userId, totalScore]) => ({ userId, totalScore }))
      .sort((a, b) => b.totalScore - a.totalScore || a.userId - b.userId);

    topScores.slice(0, 3).forEach((row, idx) => {
      const user = userMap.get(row.userId);
      if (!user) return;

      const rank = idx + 1;
      const rankLabel = rank === 1 ? "1位" : rank === 2 ? "2位" : "3位";

      newsItems.push({
        id: `ranking-${season.year}-${user.id}`,
        type: "ranking",
        title: `${season.year}年ランキング: ${user.name}が${rankLabel}`,
        body: `トータルスコア ${fmtScore(row.totalScore)}点。`,
        commentator: user.name,
        year: season.year,
        timestamp: season.year * 10000000 + 5000 + rank,
        icon: rank === 1 ? "🏆" : rank === 2 ? "🥈" : "🥉",
      });
    });

    // ── 3. 新規予想 (prediction) — newspaper article style ──
    // Collect all 1st picks for boldness calculation
    const allC1s: string[] = [];
    const allP1s: string[] = [];
    for (const sp of seasonPredictions) {
      const picks = picksByPredId.get(sp.id) ?? [];
      const c1 = picks.find((p) => p.league === "central" && p.rank === 1);
      const p1 = picks.find((p) => p.league === "pacific" && p.rank === 1);
      if (c1) allC1s.push(c1.teamName);
      if (p1) allP1s.push(p1.teamName);
    }

    for (const pred of seasonPredictions) {
      const user = userMap.get(pred.userId);
      if (!user) continue;

      const picks = picksByPredId.get(pred.id) ?? [];
      const centralPicks = picks
        .filter((p) => p.league === "central")
        .sort((a, b) => a.rank - b.rank)
        .map((p) => p.teamName);
      const pacificPicks = picks
        .filter((p) => p.league === "pacific")
        .sort((a, b) => a.rank - b.rank)
        .map((p) => p.teamName);

      const c1 = centralPicks[0] ?? "???";
      const p1 = pacificPicks[0] ?? "???";

      // Generate full newspaper article (v3)
      const articleVars = buildArticleVars(
        user.name, season.year, centralPicks, pacificPicks,
        allC1s, allP1s, user.source,
      );
      const article = generateFullArticle(user.id, articleVars);

      newsItems.push({
        id: `prediction-${season.year}-${user.id}`,
        type: "prediction",
        title: article.headline,
        body: article.lead,
        commentator: user.name,
        year: season.year,
        timestamp: season.year * 10000000 + 3000 + pred.userId,
        icon: "📰",
        source: user.source ?? undefined,
        headline: article.headline,
        lead: article.lead,
        bodyParagraphs: article.body,
        quote: article.quote,
        centralPicks,
        pacificPicks,
      });
    }

    // ── 4. 解説者注目 (spotlight) ──
    const usersByBaseName = new Map<string, { userId: number; name: string; variant: string | null; source: string | null }[]>();
    for (const userId of new Set(seasonPredictions.map((p) => p.userId))) {
      const user = userMap.get(userId);
      if (!user) continue;

      const baseName = user.name.replace(/[①②③④⑤⑥⑦⑧⑨⑩\d]+$/, "").trim();
      if (!usersByBaseName.has(baseName)) usersByBaseName.set(baseName, []);
      usersByBaseName.get(baseName)!.push({
        userId: user.id,
        name: user.name,
        variant: user.variant,
        source: user.source,
      });
    }

    for (const [baseName, variants] of usersByBaseName) {
      if (variants.length < 2) continue;

      const year = season.year;
      let bestScore = -Infinity;
      for (const v of variants) {
        const s = bestScoreFor(v.userId);
        if (s > bestScore) bestScore = s;
      }

      const scoreText = bestScore > -Infinity ? `最高${fmtScore(bestScore)}点` : "";

      spotlightItems.push({
        id: `spotlight-${year}-${baseName}`,
        type: "spotlight",
        title: `${baseName}、${year}年は${variants.length}パターン予想`,
        body: scoreText ? `複数の予想パターンを提出して${scoreText}。` : `${variants.length}通りの順位予想を提出。`,
        commentator: baseName,
        year,
        timestamp: year * 10000000 + 1000,
        icon: "🔍",
      });
    }

    for (const item of [...newsItems.slice(seasonStart), ...spotlightItems.slice(spotlightStart)]) seenIds.add(item.id);
  }

  // Spotlights were appended after every per-season item before; keep that order.
  newsItems.push(...spotlightItems);

  // Sort by timestamp descending
  newsItems.sort((a, b) => b.timestamp - a.timestamp);

  // Deduplicate
  const seen = new Set<string>();
  const unique = newsItems.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return unique.slice(0, limit);
}

function mode(arr: string[]): string {
  const freq = new Map<string, number>();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = "";
  let bestCount = 0;
  for (const [k, c] of freq) {
    if (c > bestCount) { best = k; bestCount = c; }
  }
  return best;
}
