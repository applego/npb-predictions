import Link from "next/link";
import { getTeamByName } from "@/lib/teams";
import { RESULT_LABELS, type ResultScope } from "@/lib/season-results";
import type { ResultsData } from "@/lib/season-results-data";
import { resultDate, resultObservation, resultShareTitle, resultState } from "@/lib/results-presentation";
import { ResultShare } from "./ResultShare";
import { ResultsExplorer } from "./ResultsExplorer";

export function ResultsBoard({ data, compact = false }: { data: ResultsData; compact?: boolean }) {
  const { year, years, summary, error } = data;
  const { scope, status, snapshots, target, entries, perfect } = summary;
  const base = compact ? "/" : "/rankings";
  const path = `/rankings?year=${year}&league=${scope}`;
  const stale = snapshots.some((snapshot) => snapshot.stale);
  return (
    <div className="results-page">
      <header className="result-intro-header">
        <h1>{year}年 順位予想の答え合わせ</h1>
        <p>解説者の予想と実順位を比較。出典は各人の内訳へ。</p>
      </header>
      <div className="result-controls" id="results">
        <nav className="result-tabs" aria-label="答え合わせのリーグ">
          {(["central", "pacific", "all"] as ResultScope[]).map((league) => (
            <Link key={league} href={`${base}?year=${year}&league=${league}#results`} aria-current={scope === league ? "page" : undefined}>{RESULT_LABELS[league]}</Link>
          ))}
        </nav>
        <form method="get" action={base} className="result-year">
          <label htmlFor="result-year">年度</label>
          <select name="year" id="result-year" defaultValue={year} key={year}>
            {(years.includes(year) ? years : [year, ...years]).map((value) => <option key={value} value={value}>{value}年</option>)}
          </select>
          <input type="hidden" name="league" value={scope} /><button type="submit">表示</button>
        </form>
      </div>
      <section className="result-observation" aria-label="結果の状態と更新日時">
        <strong className={`result-status result-status-${status}`}>{resultState(summary)}</strong>
        <span>{snapshots.map((snapshot, index) => (
          <span className="result-update" key={snapshot.league}>
            {index > 0 && " ／ "}{scope === "all" && `${RESULT_LABELS[snapshot.league]} `}
            更新：{snapshot.updatedAt ? <time dateTime={snapshot.updatedAt}>{resultDate(snapshot.updatedAt)} JST</time> : "未確認"}
          </span>
        ))}</span>
      </section>
      {(error || status === "unavailable") && <div className="result-notice" role="status">
        <strong>{error === "unknown-year" ? "この年度のデータは登録されていません。" : "集計に必要なデータが揃っていません。"}</strong>
        <p>取得失敗や順位の欠損を「的中者ゼロ」とは扱いません。</p><Link href={path}>データを再確認する</Link>
      </div>}
      {stale && <div className="result-notice" role="status"><strong>順位データの更新から36時間以上経過しています。</strong><p>以下は表示日時点の比較です。現在順位・最終結果ではありません。</p></div>}
      <p className="result-summary-line">
        <strong>{status === "final" ? "全順位的中" : "この時点で全順位一致"}：{perfect === null ? "集計待ち" : `${perfect}人`}</strong>
        <span>対象 {summary.eligible}人・{target}球団</span>
      </p>
      <details className="result-standings-fold">
        <summary>球団の順位を見る<span className="result-fold-hint">集計基準・公式リンク</span></summary>
        <div className="result-snapshots">{snapshots.map((snapshot) => (
          <section key={snapshot.league} className="result-snapshot" aria-label={`${RESULT_LABELS[snapshot.league]}の集計基準順位`}>
            <h2>{RESULT_LABELS[snapshot.league]}の球団順位 <span>{snapshot.status === "final" ? "確定" : snapshot.status === "provisional" ? "暫定" : "未取得・不完全"}</span></h2>
            {snapshot.rows.length ? <ol className="result-team-strip">{snapshot.rows.map((standing) => (
              <li key={standing.rank}><span>{standing.rank}位</span><b>{getTeamByName(standing.teamName)?.shortName ?? standing.teamName}</b></li>
            ))}</ol> : <p>同一時点の6球団が揃うまで集計を保留します。</p>}
            <a href={`https://npb.jp/bis/${year}/stats/std_${snapshot.league === "central" ? "c" : "p"}.html`} target="_blank" rel="noopener noreferrer">NPB公式順位を確認 ↗</a>
          </section>
        ))}</div>
      </details>
      <section className="result-main-section" aria-labelledby="result-list-title">
        <h2 id="result-list-title">解説者の的中ランキング</h2>
        <p className="result-sort-note">並び順：一致数↓ → 順位差合計↑（同点は同順位）</p>
        {entries.length ? <ResultsExplorer key={`${year}-${scope}`} entries={entries} target={target} year={year} scope={scope} isFinal={status === "final"} compact={compact} observation={resultObservation(summary)} stateLabel={resultState(summary)} /> : (
          <div className="result-empty"><h3>比較できる予想・順位を確認中です</h3><p>ロック済み予想と、同一時点の6球団分の実順位が必要です。</p><Link href={`/rankings/predictions?year=${year}`}>登録されている予想を見る</Link></div>
        )}
      </section>
      {entries.length > 0 && <div className="result-board-share"><ResultShare path={path} title={resultShareTitle(year, summary)} /></div>}
      <details className="result-method" id="method"><summary>集計ルール・出典について</summary><div>
        <p>当サイトに登録された解説者・評論家のロック済み予想が対象です。各リーグ6球団・1〜6位が重複なく揃うものを集計し、総合はセ・パ両方を必要とします。対象 {summary.eligible}人、予想が不完全などで対象外 {summary.excluded}人です。外部記事とは母集団が異なります。</p>
        <p>同じ登録者に複数の予想がある場合は通常版、登録日時、予想IDの順で採用します。成績の良い版を後付けで選びません。掲載媒体ごとに登録が分かれている場合は登録ID単位の人数です。</p>
        <p>順位差合計は各球団の予想順位と実順位の差を足した数値です。この画面の並びは従来のポイント制とは異なり、ポイント計算は変更していません。日付だけで確定と判定せず、各リーグの最新の同一時点の6球団すべてに確定フラグがある場合だけ「確定」と表示します。</p>
        <p>「出典リンクあり」はリンクが登録されているという意味で、内容の検証済みを保証する表示ではありません。未登録は明示します。</p>
        <Link href={`/rankings/scoreboard?year=${year}`}>ポイント制の成績を見る →</Link>
      </div></details>
      <nav className="result-related" aria-label="関連する予想と成績">
        <Link href={`/rankings/predictions?year=${year}`}>全員の予想を比較</Link>
        <Link href={`/rankings/titles?year=${year}`}>個人タイトル予想</Link>
        <Link href="/rankings/all-time">過去成績</Link>
      </nav>
    </div>
  );
}
