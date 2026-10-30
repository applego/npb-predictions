import Link from "next/link";
import { getTeamByName } from "@/lib/teams";
import { RESULT_LABELS, type ResultScope } from "@/lib/season-results";
import type { ResultsData } from "@/lib/season-results-data";
import { resultDate, resultObservation, resultShareTitle, resultState } from "@/lib/results-presentation";
import { ResultShare } from "./ResultShare";
import { ResultsExplorer } from "./ResultsExplorer";

export function ResultsBoard({ data, compact = false }: { data: ResultsData; compact?: boolean }) {
  const { year, years, summary, error, coverage } = data;
  const { scope, status, snapshots, target, entries, perfect } = summary;
  const base = compact ? "/" : "/rankings";
  const path = `/rankings?year=${year}&league=${scope}`;
  const stale = snapshots.some((snapshot) => snapshot.stale);
  const evidence = coverage?.selectionEvidence;
  const emptyFinal = Boolean(evidence && status === "final" && summary.eligible === 0);
  return (
    <div className="results-page">
      <header className="result-intro-header duel-hero">
        <div className="duel-hero-copy">
          <p className="duel-eyebrow">SEASON REVIEW <span>{year} / {resultState(summary)}</span></p>
          <h1>予想の答えは、<em>結果にある。</em></h1>
          <p>誰が、どこまで読めていた？ 解説者の予想を得点と球団別の内訳で比較。</p>
        </div>
        <a className="duel-hero-score" href="#result-list-title"><span>{RESULT_LABELS[scope]} / 比較対象</span><strong>{summary.eligible}<small>件</small></strong><p>{target}球団の予想を比較 ↘</p></a>
      </header>
      <div className="result-controls" id="results">
        <nav className="result-tabs" aria-label="答え合わせのリーグ">
          {(["central", "pacific", "all"] as ResultScope[]).map((league) => (
            <Link prefetch={false} key={league} href={`${base}?year=${year}&league=${league}#results`} aria-current={scope === league ? "page" : undefined}>{RESULT_LABELS[league]}</Link>
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
      <details className="result-context">
        <summary><strong className={`result-status result-status-${status}`}>{resultState(summary)}</strong><span>{evidence ? "保存分の比較対象" : coverage ? "公開保存分" : "対象"} {summary.eligible}件</span><span>集計情報・出典 ⌄</span></summary>
      {coverage && <details className="result-standings-fold" aria-label="収録範囲">
        <summary>{evidence ? "保存分の比較対象" : "公開保存分"}：セ{coverage.central}件／パ{coverage.pacific}件</summary>
        <p>{evidence ? `年度内のロック済み解説者予想${evidence.candidates}件から、登録者IDごとに${evidence.registrations}件を採用。パのみ登録・空・不完全な予想も保存し、比較には6球団が揃う予想を使用します。全登録者を収録したものではありません。` : `セの公開一覧に掲載された${coverage.central}件を収録。パはそのうち予想がある${coverage.pacific}件が対象で、パのみ登録の人は含みません。`}予想の掲載確認：{resultDate(coverage.observedAt)} JST。</p>
      </details>}
      <section className="result-observation" aria-label="結果の状態と更新日時">

        <span>{snapshots.map((snapshot, index) => (
          <span className="result-update" key={snapshot.league}>
            {index > 0 && " ／ "}{scope === "all" && `${RESULT_LABELS[snapshot.league]} `}
            更新：{snapshot.updatedAt ? <time dateTime={snapshot.updatedAt}>{resultDate(snapshot.updatedAt)} JST</time> : "未確認"}
          </span>
        ))}</span>
      </section>
      <p className="result-summary-line">
        <strong><a href={`${path}&perfect=1#result-list-title`}>{status === "final" ? `${coverage ? "収録分の" : ""}全順位的中` : "この時点で全順位一致"}：{emptyFinal ? "比較対象なし" : perfect === null ? "集計待ち" : `${perfect}件`}</a></strong>
        <span><a href={`${path}#result-list-title`}>対象 {summary.eligible}件</a>・{target}球団</span>
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
      </details>
      {(error || status === "unavailable") && <div className="result-notice" role="status">
        <strong>{error === "unknown-year" ? "この年度のデータは登録されていません。" : "集計に必要なデータが揃っていません。"}</strong>
        <p>取得失敗や順位の欠損を「的中者ゼロ」とは扱いません。</p><Link prefetch={false} href={path}>データを再確認する</Link>
      </div>}
      {stale && <div className="result-notice" role="status"><strong>順位データの更新から36時間以上経過しています。</strong><p>以下は表示日時点の比較です。現在順位・最終結果ではありません。</p></div>}
      <section className="result-main-section" aria-labelledby="result-list-title">
        <h2 id="result-list-title">解説者の予想ランキング</h2>
        <p className="result-sort-note">既定は順位予想点。評価指標を切り替えて比較できます。同点は同順位。</p>
        {entries.length ? <ResultsExplorer key={`${year}-${scope}`} entries={entries} target={target} year={year} scope={scope} isFinal={status === "final"} compact={compact} observation={resultObservation(summary)} stateLabel={resultState(summary)} /> : (
          <div className="result-empty"><h3>{emptyFinal ? "6球団が揃う予想は0件です" : "比較できる予想・順位を確認中です"}</h3><p>{emptyFinal ? `この保存分では対象外${summary.excluded}件です。別リーグの比較対象は「収録範囲」で確認できます。` : "ロック済み予想と、同一時点の6球団分の実順位が必要です。"}</p><Link prefetch={false} href={`/rankings/predictions?year=${year}`}>登録されている予想を見る</Link></div>
        )}
      </section>
      {entries.length > 0 && <div className="result-board-share"><ResultShare path={path} title={resultShareTitle(year, summary)} /></div>}
      {scope !== "all" && entries.length > 0 && (
        <aside className="result-next-read" aria-label="自分の予想を並べる">
          <div><p>あなたなら何位と読んだ？</p><h2>解説者の予想と、あなたの予想を一覧に。</h2><span>新聞の予想一覧のように並べて、点数と的中を画像で保存・共有できます。</span></div>
          <Link prefetch={false} className="result-button result-button-secondary" href={`/sheet?year=${year}&league=${scope}`}>予想一覧をつくる <span aria-hidden="true">→</span></Link>
        </aside>
      )}
      <aside className="result-next-read" aria-label="次に読む">
        <div><p>野球を、もう一歩おもしろく。</p><h2>答え合わせの次は、観戦へ。</h2><span>視聴方法や予想に役立つ本・道具をまとめました。</span></div>
        <Link prefetch={false} className="result-button result-button-secondary" href="/resources">観戦ガイドを見る <span aria-hidden="true">↗</span></Link>
      </aside>
      <details className="result-method" id="method"><summary>集計ルール・出典について</summary><div>
        <p>{evidence ? `公開API観測時のロック済みフラグと元の登録日時を保存しています。採用した${evidence.registrations}件中、ロック日時が未記録なのは${evidence.missingLockedAt}件です。当時のロックを確認済みという意味ではありません。` : coverage ? "公開APIに掲載されていた予想の固定保存が対象です。ロック状態・元の登録日時はこの保存に含まれません。" : "当サイトに登録された解説者・評論家のロック済み予想が対象です。"}各リーグ6球団・1〜6位が重複なく揃うものを集計し、総合はセ・パ両方を必要とします。対象 {summary.eligible}件、予想が不完全などで対象外 {summary.excluded}件です。外部記事とは母集団が異なります。</p>
        <p>{coverage && !evidence ? "公開一覧の登録者IDごとに保存された1件を比較しています。保存後に成績の良い版へ差し替えていません。通常版優先・最古登録の採用を保証する保存ではありません。" : "同じ登録者に複数の予想がある場合は通常版、登録日時、予想IDの順で採用します。成績の良い版を後付けで選びません。"}掲載媒体ごとに登録が分かれている場合は登録ID単位の件数です。一覧では名前・予想・出典・採点が完全に同じ登録だけをまとめて表示し、採点と順位は変えていません。</p>
        <p>既定は順位予想点の高い順です。一致数の多い順・順位差合計の少ない順にも切り替えられ、各指標で同点は同順位です。球団ごとの順位差が0/1/2/3/4/5のとき、+5/+3/+1/−1/−3/−5点を加算します。個人タイトル点は含みません。順位差合計は各球団の予想順位と実順位の差を足した数値です。従来の順位予想のポイント計算を使用しています。日付だけで確定と判定せず、各リーグの最新の同一時点の6球団すべてに確定フラグがある場合だけ「確定」と表示します。</p>
        <p>「出典リンクあり」はリンクが登録されているという意味で、内容の検証済みを保証する表示ではありません。未登録は明示します。</p>
        <Link prefetch={false} href={`/rankings/scoreboard?year=${year}`}>ポイント制の成績を見る →</Link>
      </div></details>
      <nav className="result-related" aria-label="関連する予想と成績">
        <Link prefetch={false} href={`/rankings/predictions?year=${year}`}>全員の予想を比較</Link>
        <Link prefetch={false} href={`/rankings/titles?year=${year}`}>個人タイトル予想</Link>
        <Link prefetch={false} href="/rankings/all-time">過去成績</Link>
      </nav>
    </div>
  );
}
