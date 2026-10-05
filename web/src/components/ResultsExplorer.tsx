"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTeamByName } from "@/lib/teams";
import { RESULT_LABELS, type ResultEntry, type ResultScope } from "@/lib/season-results";
import { ResultShare } from "./ResultShare";

export function ResultsExplorer({ entries, target, year, scope, isFinal, compact = false }: {
  entries: ResultEntry[]; target: number; year: number; scope: ResultScope; isFinal: boolean; compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    function revealSharedResult() {
      const match = /^#predictor-(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const detail = document.getElementById(`predictor-${match[1]}`);
      if (detail instanceof HTMLDetailsElement) {
        detail.open = true;
        detail.scrollIntoView({ block: "start" });
      }
    }
    revealSharedResult();
    window.addEventListener("hashchange", revealSharedResult);
    return () => window.removeEventListener("hashchange", revealSharedResult);
  }, [entries]);
  const [onlyPerfect, setOnlyPerfect] = useState(false);
  const shown = useMemo(() => entries.filter((entry) =>
    (!onlyPerfect || entry.exact === target) &&
    `${entry.name} ${entry.source ?? ""}`.toLocaleLowerCase("ja").includes(query.trim().toLocaleLowerCase("ja")),
  ), [entries, target, query, onlyPerfect]);
  const visible = compact && !query && !onlyPerfect ? shown.slice(0, 8) : shown;
  return (
    <div className="result-explorer">
      <div className="result-tools">
        <label className="result-search">
          <span>解説者・出典を検索</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前や番組名で探す" />
        </label>
        <label className="result-checkbox"><input type="checkbox" checked={onlyPerfect} onChange={(event) => setOnlyPerfect(event.target.checked)} />全順位一致のみ</label>
      </div>
      <p className="result-count" role="status">{shown.length}人中 {visible.length}人を表示 <span>／ 的中数が多い順。同数なら順位差合計が小さい順。</span></p>
      {!shown.length && <div className="result-empty"><h3>条件に合う予想がありません</h3><p>検索語を短くするか、「全順位一致のみ」を解除してください。</p><button className="result-button result-button-secondary" onClick={() => { setQuery(""); setOnlyPerfect(false); }} type="button">絞り込みを解除</button></div>}
      <div className="result-list">
        {visible.map((entry) => (
          <details className="result-person" key={entry.userId} id={`predictor-${entry.userId}`}>
            <summary>
              <span className="result-position"><b>{entry.rank}</b><small>位</small></span>
              <span className="result-person-name"><strong>{entry.name}</strong><small>{entry.source ?? "出典情報なし"}</small></span>
              <span className="result-match"><b>{entry.exact}</b><span> / {target}<small>順位一致</small></span></span>
              <span className="result-expand" aria-hidden="true">＋</span>
            </summary>
            <div className="result-person-body">
              <p className="result-person-note">{entry.exact === target ? (isFinal ? "全順位を完全的中。" : "この更新時点では全順位が一致。最終的中は未確定です。") : `順位差の合計は ${entry.deviation}。`} 予想した球団が実際に何位になったかを比較します。</p>
              <div className="result-detail-scroll" tabIndex={0} role="region" aria-label={`${entry.name}の予想と実順位の比較`}>
                <table className="result-detail-table">
                  <caption>{year}年 {entry.name}の答え合わせ（{isFinal ? "確定" : "暫定"}）</caption>
                  <thead><tr><th scope="col">リーグ・球団</th><th scope="col">予想</th><th scope="col">実順位</th><th scope="col">判定</th></tr></thead>
                  <tbody>{entry.details.map((detail) => {
                    const team = getTeamByName(detail.teamName);
                    return <tr key={`${detail.league}:${detail.teamName}`}><th scope="row"><span className="result-league-short">{detail.league === "central" ? "セ" : "パ"}</span>{team?.shortName ?? detail.teamName}</th><td>{detail.predictedRank}位</td><td>{detail.actualRank}位</td><td><span className={detail.difference === 0 ? "result-hit" : "result-miss"}>{detail.difference === 0 ? "一致" : `${detail.difference}位差`}</span></td></tr>;
                  })}</tbody>
                </table>
              </div>
              <div className="result-person-links">
                <Link href={`/users/${entry.userId}?year=${year}`}>この人の成績を見る →</Link>
                {entry.sourceUrl ? <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">予想の出典を確認 ↗</a> : <span>出典リンク未登録</span>}
              </div>
              <ResultShare path={`/rankings?year=${year}&league=${scope}#predictor-${entry.userId}`} title={`${year}年 ${RESULT_LABELS[scope]}｜${entry.name}は${entry.exact}/${target}順位一致（${isFinal ? "確定" : "暫定"}）｜NPB予想リーグ`} />
            </div>
          </details>
        ))}
      </div>
      {compact && <Link className="result-button result-button-secondary result-all-link" href={`/rankings?year=${year}&league=${scope}`}>答え合わせ一覧をすべて見る →</Link>}
    </div>
  );
}
