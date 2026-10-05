import { getTeamByName } from "./teams";
import { RESULT_LABELS, type ResultEntry, type ResultSummary } from "./season-results";

export function resultDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "更新日時未確認";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

/** Preserve the observation time of EACH league; combined views can differ. */
export function resultObservation(summary: ResultSummary): string {
  return summary.snapshots.map((snapshot) =>
    `${RESULT_LABELS[snapshot.league]} ${snapshot.updatedAt ? `${resultDate(snapshot.updatedAt)} JST` : "更新日時未確認"}`,
  ).join(" / ");
}

export function resultState(summary: ResultSummary): string {
  if (summary.status === "unavailable") return "集計保留";
  if (summary.status === "final") return "確定";
  return summary.snapshots.some((snapshot) => snapshot.stale) ? "暫定・更新遅延" : "暫定";
}

/** Show one deterministic largest mismatch without changing the ranking. */
export function resultDifference(entry: ResultEntry): string {
  const difference = [...entry.details].sort((a, b) =>
    b.difference - a.difference || a.league.localeCompare(b.league) || a.predictedRank - b.predictedRank,
  )[0];
  if (!difference) return "内訳を確認中";
  if (difference.difference === 0) return "すべての球団の順位が一致";
  const team = getTeamByName(difference.teamName)?.shortName ?? difference.teamName;
  return `主な差分：${team} 予想${difference.predictedRank}位 → 実順位${difference.actualRank}位`;
}

export function resultShareTitle(year: number, summary: ResultSummary, entry?: ResultEntry): string {
  const subject = entry ? `${entry.name}は${summary.target}球団中${entry.exact}球団一致` : "順位予想の答え合わせ";
  return `${year}年 ${RESULT_LABELS[summary.scope]}｜${subject}（${resultState(summary)}）｜集計基準：${resultObservation(summary)}｜NPB予想リーグ`;
}
