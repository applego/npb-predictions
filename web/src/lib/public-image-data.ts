import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  actualTeamStandings,
  gameResults,
  scoreSnapshots,
  seasons,
  users,
} from "@/db/schema";
import { getTeamByName, type NpbTeam } from "@/lib/teams";

type GameRow = typeof gameResults.$inferSelect;
type StandingRow = typeof actualTeamStandings.$inferSelect;
type ScoreRow = typeof scoreSnapshots.$inferSelect;
type UserRow = typeof users.$inferSelect;

export type HeadlineChar = {
  char: string;
  size: number;
  style: "solid" | "outline";
  color?: string;
};

export interface TeamNewspaperArticle {
  date: string;
  edition: string;
  kicker: string;
  dramaticBanner: string;
  headlineLine1: HeadlineChar[];
  headlineLine2: HeadlineChar[];
  subheadline: string;
  opponent: string;
  opponentAbbr: string;
  scoreLine: string;
  venue: string;
  focusName: string;
  focusStat: string;
  facts: { label: string; stat: string; caption: string }[];
  body: string[];
  seasonRecord: string;
  leagueRank: string;
  nextGame: string;
  quote: string;
  quoteBy: string;
}

export interface RankingCardRow {
  name: string;
  affiliation: string;
  year: string;
  role: string;
  value: string;
}

export interface RankingCardSection {
  label: string;
  rows: RankingCardRow[];
}

export interface RankingCardData {
  title: string;
  note: string;
  sections: RankingCardSection[];
}

function formatJstDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}年${month}月${day}日`;
}

function formatGameDate(gameDate: string): string {
  const [year, month, day] = gameDate.split("-");
  if (!year || !month || !day) return gameDate;
  return `${Number(month)}/${Number(day)}`;
}

function todayJst(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function teamAbbr(name: string): string {
  return getTeamByName(name)?.abbr ?? name.slice(0, 2);
}

function canonicalTeamName(name: string): string {
  return getTeamByName(name)?.name ?? name;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function roleLabel(role: string | null): string {
  if (role === "commentator") return "解説";
  if (role === "friend") return "参加";
  if (role === "system") return "集計";
  return "参加";
}

function latestStandingForTeam(
  standings: StandingRow[],
  team: NpbTeam,
): StandingRow | null {
  const teamName = canonicalTeamName(team.name);
  return (
    standings.find((row) => canonicalTeamName(row.teamName) === teamName) ??
    null
  );
}

function articleHeadline(team: NpbTeam, game: GameRow): HeadlineChar[][] {
  const red = "#dc2626";
  const subject = team.shortName[0] ?? team.abbr;
  const isHome = canonicalTeamName(game.homeTeam) === team.name;
  const ownScore = isHome ? game.homeScore : game.awayScore;
  const oppScore = isHome ? game.awayScore : game.homeScore;
  const isFinal =
    game.status === "final" && ownScore !== null && oppScore !== null;

  if (game.status === "postponed" || game.status === "cancelled") {
    return [
      [
        { char: subject, size: 250, style: "solid", color: red },
        { char: "、", size: 100, style: "outline" },
        { char: game.status === "postponed" ? "延" : "中", size: 165, style: "outline" },
      ],
      [
        { char: game.status === "postponed" ? "期" : "止", size: 180, style: "outline" },
        { char: "！", size: 280, style: "solid", color: red },
      ],
    ];
  }

  if (game.status === "in_progress") {
    return [
      [
        { char: subject, size: 250, style: "solid", color: red },
        { char: "、", size: 100, style: "outline" },
        { char: "試", size: 165, style: "outline" },
      ],
      [
        { char: "合", size: 180, style: "outline" },
        { char: "中", size: 180, style: "outline" },
        { char: "！", size: 280, style: "solid", color: red },
      ],
    ];
  }

  if (!isFinal) {
    return [
      [
        { char: subject, size: 250, style: "solid", color: red },
        { char: "、", size: 100, style: "outline" },
        { char: "試", size: 165, style: "outline" },
      ],
      [
        { char: "合", size: 180, style: "outline" },
        { char: "へ", size: 180, style: "outline" },
        { char: "！", size: 280, style: "solid", color: red },
      ],
    ];
  }

  const won = ownScore > oppScore;
  if (ownScore === oppScore) {
    return [
      [
        { char: subject, size: 250, style: "solid", color: red },
        { char: "、", size: 100, style: "outline" },
        { char: "分", size: 165, style: "outline" },
      ],
      [
        { char: "け", size: 180, style: "outline" },
        { char: "！", size: 280, style: "solid", color: red },
      ],
    ];
  }

  return [
    [
      { char: subject, size: 250, style: "solid", color: red },
      { char: "、", size: 100, style: "outline" },
      { char: won ? "勝" : "惜", size: 165, style: "outline" },
    ],
    [
      { char: won ? "利" : "敗", size: 180, style: "outline" },
      { char: "！", size: 280, style: "solid", color: red },
    ],
  ];
}

export function buildTeamArticleFromRows(
  team: NpbTeam,
  game: GameRow,
  standing: StandingRow | null,
  nextGame: GameRow | null,
): TeamNewspaperArticle {
  const isHome = canonicalTeamName(game.homeTeam) === team.name;
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const ownScore = isHome ? game.homeScore : game.awayScore;
  const oppScore = isHome ? game.awayScore : game.homeScore;
  const hasScore = ownScore !== null && oppScore !== null;
  const scoreLine = hasScore
    ? `${ownScore}-${oppScore}`
    : game.status === "postponed"
      ? "延期"
      : game.status === "cancelled"
        ? "中止"
        : game.status === "in_progress"
          ? "試合中"
          : "試合前";
  const statusLabel =
    game.status === "final"
      ? "試合終了"
      : game.status === "in_progress"
        ? "試合中"
        : game.status === "postponed"
          ? "延期"
          : game.status === "cancelled"
            ? "中止"
            : "試合予定";
  const leagueRank = standing
    ? `${standing.league === "central" ? "セ" : "パ"}・リーグ ${standing.rank}位`
    : `${team.league === "central" ? "セ" : "パ"}・リーグ`;
  const seasonRecord = standing
    ? `${standing.wins}勝 ${standing.losses}敗 ${standing.draws}分`
    : "順位データ確認中";
  const nextGameText = nextGame
    ? `${formatGameDate(nextGame.gameDate)} vs ${
        canonicalTeamName(nextGame.homeTeam) === team.name
          ? getTeamByName(nextGame.awayTeam)?.shortName ?? nextGame.awayTeam
          : getTeamByName(nextGame.homeTeam)?.shortName ?? nextGame.homeTeam
      } @ ${nextGame.stadium ?? "球場未定"}`
    : "次戦データ確認中";
  const [headlineLine1, headlineLine2] = articleHeadline(team, game);
  const opponentShort = getTeamByName(opponent)?.shortName ?? opponent;
  const venue = game.stadium ?? "球場未定";

  const bodyLead = game.status === "in_progress"
    ? `${formatGameDate(game.gameDate)}の${venue}で、${team.shortName}は${opponentShort}戦を戦っている。現在のスコアは${scoreLine}。現在の順位は${leagueRank}、シーズン成績は${seasonRecord}。`
    : hasScore
      ? `${formatGameDate(game.gameDate)}の${venue}、${team.shortName}は${opponentShort}戦を${scoreLine}で終えた。現在の順位は${leagueRank}、シーズン成績は${seasonRecord}。`
    : game.status === "postponed" || game.status === "cancelled"
      ? `${formatGameDate(game.gameDate)}の${venue}で予定されていた${team.shortName}と${opponentShort}の一戦は${scoreLine}となった。現在の順位は${leagueRank}、シーズン成績は${seasonRecord}。`
      : `${formatGameDate(game.gameDate)}の${venue}で、${team.shortName}は${opponentShort}戦に臨む。現在の順位は${leagueRank}、シーズン成績は${seasonRecord}。`;

  return {
    date: formatJstDate(new Date(`${game.gameDate}T00:00:00+09:00`)),
    edition: statusLabel,
    kicker: `${team.shortName} ${opponentShort}戦`,
    dramaticBanner: `${leagueRank} ${seasonRecord}`,
    headlineLine1,
    headlineLine2,
    subheadline: `${venue} ${team.shortName} ${scoreLine} ${opponentShort}`,
    opponent,
    opponentAbbr: teamAbbr(opponent),
    scoreLine,
    venue,
    focusName: team.shortName,
    focusStat: `${leagueRank} / ${seasonRecord}`,
    facts: [
      { label: "順位", stat: leagueRank, caption: "最新順位表" },
      { label: "成績", stat: seasonRecord, caption: "勝敗分" },
      { label: "次戦", stat: nextGameText, caption: "日程" },
    ],
    body: [
      bodyLead,
      `この紙面は本番D1の試合日程、順位表、勝敗データから自動生成している。未取得の項目は確認中として扱い、取得済みの実在データだけを紙面化する。`,
      `予想リーグの採点では、最新順位と開幕前予想の差をもとにスコアを更新する。${team.shortName}の順位変動は、参加者の得点にも直結する。`,
    ],
    seasonRecord,
    leagueRank,
    nextGame: nextGameText,
    quote: `データ更新: ${statusLabel}`,
    quoteBy: "NPB予想リーグ",
  };
}

export async function getTeamNewspaperArticle(
  team: NpbTeam,
): Promise<TeamNewspaperArticle | null> {
  const db = getDb();
  const [activeSeason] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true))
    .limit(1);
  if (!activeSeason) return null;

  const allGames = await db
    .select()
    .from(gameResults)
    .where(
      and(
        eq(gameResults.seasonId, activeSeason.id),
        or(eq(gameResults.homeTeam, team.name), eq(gameResults.awayTeam, team.name)),
      ),
    )
    .orderBy(desc(gameResults.gameDate), desc(gameResults.snapshotDate));
  const sortedGames = [...allGames].sort((a, b) =>
    a.gameDate.localeCompare(b.gameDate),
  );
  const today = todayJst();
  const game =
    sortedGames
      .slice()
      .reverse()
      .find((row) => row.gameDate <= today || row.status !== "scheduled") ??
    sortedGames[0];
  if (!game) return null;

  const standings = await db
    .select()
    .from(actualTeamStandings)
    .where(eq(actualTeamStandings.seasonId, activeSeason.id))
    .orderBy(desc(actualTeamStandings.snapshotDate));

  const nextGame =
    sortedGames.find(
      (row) => row.gameDate > game.gameDate && row.status === "scheduled",
    ) ?? null;

  return buildTeamArticleFromRows(
    team,
    game,
    latestStandingForTeam(standings, team),
    nextGame,
  );
}

function toCardRows(
  scores: ScoreRow[],
  userMap: Map<number, UserRow>,
  value: (row: ScoreRow) => number,
  seasonYear: number,
): RankingCardRow[] {
  const seen = new Set<number>();
  return scores
    .filter((row) => {
      if (seen.has(row.userId)) return false;
      seen.add(row.userId);
      return userMap.has(row.userId);
    })
    .sort((a, b) => value(b) - value(a))
    .slice(0, 5)
    .map((row) => {
      const user = userMap.get(row.userId)!;
      return {
        name: user.name,
        affiliation: user.source || "個人参加",
        year: String(seasonYear).slice(-2),
        role: roleLabel(user.role),
        value: formatSigned(value(row)),
      };
    });
}

export async function getRankingCardData(): Promise<RankingCardData | null> {
  const db = getDb();
  const [activeSeason] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true))
    .limit(1);
  if (!activeSeason) return null;

  const [allUsers, allScores] = await Promise.all([
    db.select().from(users),
    db
      .select()
      .from(scoreSnapshots)
      .where(eq(scoreSnapshots.seasonId, activeSeason.id))
      .orderBy(desc(scoreSnapshots.snapshotDate), desc(scoreSnapshots.totalScore)),
  ]);
  if (allScores.length === 0) return null;

  const userMap = new Map(allUsers.map((user) => [user.id, user]));

  return {
    title: `${activeSeason.year}シーズン 予想的中スコア 上位5傑`,
    note: "注 ポイントは本番D1の最新スコアスナップショットから集計",
    sections: [
      {
        label: "総合",
        rows: toCardRows(allScores, userMap, (row) => row.totalScore, activeSeason.year),
      },
      {
        label: "順位予想",
        rows: toCardRows(allScores, userMap, (row) => row.rankingScore, activeSeason.year),
      },
      {
        label: "タイトル",
        rows: toCardRows(allScores, userMap, (row) => row.titleScore, activeSeason.year),
      },
    ],
  };
}
