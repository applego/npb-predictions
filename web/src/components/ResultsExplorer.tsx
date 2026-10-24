"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTeamByName } from "@/lib/teams";
import { RESULT_LABELS, resultPoints, rankResultEntries, type ResultEntry, type ResultScope } from "@/lib/season-results";
import { groupIdenticalResults, resultDifference } from "@/lib/results-presentation";
import { recordGrowth } from "@/lib/growth-events";
import { ResultCardDownload } from "./ResultCardDownload";
import { ResultShare } from "./ResultShare";

export function ResultsExplorer({ entries, target, year, scope, isFinal, observation, stateLabel, compact = false }: {
  entries: ResultEntry[]; target: number; year: number; scope: ResultScope; isFinal: boolean; observation: string; stateLabel: string; compact?: boolean;
}) {
  useEffect(() => { recordGrowth("result_view", year, scope); }, [year, scope]);
  const [sort, setSort] = useState<"points" | "exact" | "deviation">("points");
  const rankingLabel = sort === "points" ? "得点順位" : sort === "exact" ? "一致数順位" : "順位差順位";
  const [query, setQuery] = useState("");
  const [onlyPerfect, setOnlyPerfect] = useState(false);
  function updateFilters(nextQuery: string, nextPerfect: boolean) {
    setQuery(nextQuery); setOnlyPerfect(nextPerfect);
    const url = new URL(window.location.href);
    if (nextQuery) url.searchParams.set("q", nextQuery); else url.searchParams.delete("q");
    if (nextPerfect) url.searchParams.set("perfect", "1"); else url.searchParams.delete("perfect");
    window.history.replaceState(window.history.state, "", url);
  }
  useEffect(() => {
    function restoreFilters() {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get("q") ?? ""); setOnlyPerfect(params.get("perfect") === "1");
      const value = params.get("sort"); setSort(value === "exact" || value === "deviation" ? value : "points");
    }
    restoreFilters();
    window.addEventListener("popstate", restoreFilters);
    return () => window.removeEventListener("popstate", restoreFilters);
  }, []);
  useEffect(() => {
    function revealSharedResult() {
      const match = /^#predictor-(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const element = document.querySelector(`main #predictor-${match[1]}`);
      const detail = element instanceof HTMLDetailsElement ? element : element?.closest("details");
      if (detail instanceof HTMLDetailsElement) {
        detail.open = true;
        detail.scrollIntoView({ block: "start" });
      }
    }
    revealSharedResult();
    window.addEventListener("hashchange", revealSharedResult);
    return () => window.removeEventListener("hashchange", revealSharedResult);
  }, [entries]);
  const groups = useMemo(() => groupIdenticalResults(entries), [entries]);
  const shown = useMemo(() => groups.filter(({ entry }) =>
    (!onlyPerfect || entry.exact === target) &&
    `${entry.name} ${entry.source ?? ""}`.toLocaleLowerCase("ja").includes(query.trim().toLocaleLowerCase("ja")),
  ), [groups, target, query, onlyPerfect]);
  const ordered = useMemo(() => {
    const ranked = new Map(rankResultEntries(entries, sort).map(entry => [entry.userId, entry]));
    return groups.map(row => ({ ...row, entry: ranked.get(row.entry.userId)! }))
      .sort((a,b) => a.entry.rank - b.entry.rank || a.entry.name.localeCompare(b.entry.name, "ja"))
      .filter(row => shown.some(item => item.entry.userId === row.entry.userId));
  }, [entries, groups, shown, sort]);
  const visible = compact && !query && !onlyPerfect ? ordered.slice(0, 8) : ordered;
  return (
    <div className="result-explorer">
      <div className="result-sort-tabs" role="group" aria-label="ランキングの評価指標">
        {([['points', '順位予想点'], ['exact', '一致数'], ['deviation', '順位差']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={sort === value} onClick={() => {
          setSort(value); const url = new URL(window.location.href); url.searchParams.set("sort", value); window.history.replaceState(window.history.state, "", url);
        }}>{label}<span>{value === 'deviation' ? '少ない順' : '多い順'}</span></button>)}
      </div>
      <div className="result-tools">
        <label className="result-search">
          <span className="result-sr-only">解説者・出典を検索</span>
          <input type="search" value={query} onChange={(event) => updateFilters(event.target.value, onlyPerfect)} placeholder="解説者名・番組名で検索" />
        </label>
        <label className="result-checkbox"><input type="checkbox" checked={onlyPerfect} onChange={(event) => updateFilters(query, event.target.checked)} />全順位一致のみ</label>
      </div>
      <p className="result-count" role="status">{shown.length}件中 {visible.length}件を表示{groups.length < entries.length && "（同名・同内容をまとめて表示）"} </p>
      {!shown.length && <div className="result-empty"><h3>条件に合う予想がありません</h3><p>検索語を短くするか、「全順位一致のみ」を解除してください。</p><button className="result-button result-button-secondary" onClick={() => { updateFilters("", false); }} type="button">絞り込みを解除</button></div>}
      <div className="result-list">
        {visible.map(({ entry, aliases }) => (
          <details className={`result-person${entry.exact === target ? " result-person-perfect" : ""}`} key={entry.userId} id={`predictor-${entry.userId}`}>
            <summary>
              <span className="result-position" aria-label={`${rankingLabel} ${entry.rank}位`}><b>{entry.rank}</b>位</span>
              <span className="result-person-name"><strong>{entry.name}</strong>{aliases.map(id => <span key={id} id={`predictor-${id}`} hidden />)}</span>
              <span className="result-points"><small>順位予想点</small><b>{resultPoints(entry)}<i>pt</i></b></span>
              <span className="result-match">{target}球団中 <b>{entry.exact}</b>球団一致</span>
              <span className="result-deviation">順位差合計 <b>{entry.deviation}</b></span>
              <span className="result-difference">{resultDifference(entry)}</span>
              <span className="result-source-label">{entry.source ?? "出典情報なし"} · {entry.sourceUrl ? "出典リンクあり" : "出典リンク未登録"}{aliases.length > 0 && ` · 同一内容 ${aliases.length + 1}登録`}</span>
              <span className="result-expand"><span className="result-open-label">予想の内訳を見る</span><span className="result-close-label">内訳を閉じる</span><span aria-hidden="true">⌄</span></span>
            </summary>
            <div className="result-person-body">
              <p className="result-person-note">{stateLabel}・集計基準：{observation}<br />{entry.exact === target ? (isFinal ? "全順位を完全的中。" : "この更新時点では全順位が一致。最終的中は未確定です。") : `順位差の合計は ${entry.deviation}。`} 予想した球団が実際に何位になったかを比較します。</p>
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
                <Link prefetch={false} href={`/users/${entry.userId}?year=${year}`}>この人の成績を見る →</Link>
                {entry.sourceUrl ? <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">予想の出典を確認 ↗</a> : <span>出典リンク未登録</span>}
              </div>
              <div className="result-share-invitation"><h3>この答え合わせ、野球仲間にも。</h3><p>{entry.name}の予想は{target}球団中{entry.exact}球団一致。「意外と当たってる？」「ここは読めなかった！」を話のきっかけに。</p><p>共有先から、この人の予想の内訳をそのまま開けます。</p></div>
              <ResultCardDownload entry={entry} year={year} scope={scope} target={target} rankingLabel={rankingLabel} stateLabel={stateLabel} observation={observation} />
              <ResultShare path={`/rankings?year=${year}&league=${scope}&sort=${sort}#predictor-${entry.userId}`} title={`${year}年 ${RESULT_LABELS[scope]}｜${entry.name}は順位予想 ${resultPoints(entry)}点・${entry.exact}/${target}順位一致（${stateLabel}）｜集計基準：${observation}｜みんなの順位予想対決`} />
            </div>
          </details>
        ))}
      </div>
      {compact && <Link prefetch={false} className="result-button result-button-secondary result-all-link" href={`/rankings?year=${year}&league=${scope}`}>答え合わせ一覧をすべて見る →</Link>}
    </div>
  );
}
