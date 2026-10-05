import Link from "next/link";
import { getTeamByName } from "@/lib/teams";
import { RESULT_LABELS, type ResultScope } from "@/lib/season-results";
import type { ResultsData } from "@/lib/season-results-data";
import { ResultShare } from "./ResultShare";
import { ResultsExplorer } from "./ResultsExplorer";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
export function ResultsBoard({ data, compact = false }: { data: ResultsData; compact?: boolean }) {
  const { year, years, summary, error } = data;
  const { scope, status, snapshots, target, entries, perfect } = summary;
  const base = compact ? "/" : "/rankings";
  const resultPath = `/rankings?year=${year}&league=${scope}`;
  const stateLabel = status === "final" ? "確定結果" : status === "provisional" ? "暫定の答え合わせ" : "集計データ確認中";
  const leader = entries[0];
  const stale = snapshots.some((snapshot) => snapshot.stale);
  return (
    <div className="results-page">
      <section className="result-hero" aria-labelledby="results-title">
        <div className="result-hero-top"><span className="result-kicker">NPB PREDICTION REVIEW</span><span className="result-season">{year} SEASON</span></div>
        <div className="result-hero-grid">
          <div><p className="result-eyebrow">予想した春。答え合わせの秋。</p><h1 id="results-title">プロ野球 順位予想の<br /><em>答え合わせ。</em></h1><p className="result-intro">誰が当てた？ どこが意外だった？<br />解説者の予想と実順位を、出典つきで見比べよう。</p><a href="#results" className="result-button result-button-primary">答え合わせを見る <span aria-hidden="true">↘</span></a></div>
          <div className="result-feature"><span className="result-state">{RESULT_LABELS[scope]} · {stateLabel}</span><p className="result-feature-label">{status === "final" ? "全順位 完全的中" : "この時点で全順位一致"}</p><p className="result-feature-number">{perfect === null ? "—" : perfect}<small>人</small></p><p className="result-feature-caption">{perfect === null ? "集計できるデータを確認中です" : `集計対象 ${summary.eligible}人中 ／ ${target}順位すべて一致`}</p>{leader && <p className="result-feature-leader">的中数トップ <strong>{leader.name}</strong><span>{leader.exact}/{target} 順位一致{entries.filter((entry) => entry.rank === 1).length > 1 ? "（同率あり）" : ""}</span></p>}<p className="result-feature-note">{status === "final" ? "登録順位の確定フラグを確認して集計。" : "順位が動くと一致数も変わります。最終結果ではありません。"}</p></div>
        </div>
      </section>

      <div className="result-controls" id="results">
        <nav className="result-tabs" aria-label="答え合わせのリーグ">{(["central", "pacific", "all"] as ResultScope[]).map((league) => <Link key={league} href={`${base}?year=${year}&league=${league}#results`} aria-current={scope === league ? "page" : undefined}>{RESULT_LABELS[league]}</Link>)}</nav>
        <form method="get" action={base} className="result-year"><label htmlFor="result-year">年度</label><select name="year" id="result-year" defaultValue={year}>{(years.includes(year) ? years : [year, ...years]).map((value) => <option key={value} value={value}>{value}年</option>)}</select><input type="hidden" name="league" value={scope} /><button type="submit">表示</button></form>
      </div>
      {(error || status === "unavailable") && <div className="result-notice" role="status"><strong>{error === "unknown-year" ? "この年度のデータは登録されていません。" : "答え合わせを表示できるデータが揃っていません。"}</strong><p>取得失敗・順位の欠損を「的中ゼロ」とは扱いません。年度を変えるか、時間をおいて再度ご確認ください。</p><Link href={resultPath}>データを再確認する →</Link></div>}
      {stale && <div className="result-notice" role="status"><strong>順位データの更新から36時間以上経過しています。</strong><p>以下は表示日時点の答え合わせです。現在順位・最終結果として拡散せず、公式順位をご確認ください。</p></div>}
      <div className="result-snapshots">{snapshots.map((snapshot) => <section key={snapshot.league} className="result-snapshot" aria-label={`${RESULT_LABELS[snapshot.league]}の集計基準順位`}><div className="result-section-heading"><h2>{RESULT_LABELS[snapshot.league]} <span>集計基準の順位</span></h2><span className={`result-status result-status-${snapshot.status}`}>{snapshot.status === "final" ? "確定" : snapshot.status === "provisional" ? "暫定" : "未取得・不完全"}</span></div>{snapshot.rows.length ? <ol className="result-team-strip">{snapshot.rows.map((standing) => { const team = getTeamByName(standing.teamName); return <li key={standing.rank}><small>{standing.rank}位</small><span className="result-team-dot" style={{ background: team?.color }} aria-hidden="true" /><b>{team?.shortName ?? standing.teamName}</b></li>; })}</ol> : <p className="result-small">同一更新時点の6球団が揃うまで集計を保留します。</p>}<div className="result-source"><span>データ更新：{snapshot.updatedAt ? <time dateTime={snapshot.updatedAt}>{dateLabel(snapshot.updatedAt)} JST</time> : "未確認"}</span><a href={`https://npb.jp/bis/${year}/stats/std_${snapshot.league === "central" ? "c" : "p"}.html`} target="_blank" rel="noopener noreferrer">NPB公式順位を確認 ↗</a></div></section>)}</div>
      <section className="result-main-section" aria-labelledby="result-list-title"><div className="result-section-heading result-list-heading"><div><p className="result-eyebrow">PREDICTOR RANKING</p><h2 id="result-list-title">解説者の答え合わせ</h2><p className="result-small">{year}年・{RESULT_LABELS[scope]} ／ {stateLabel}</p></div><ResultShare path={resultPath} title={`${year}年 ${RESULT_LABELS[scope]} 順位予想の答え合わせ（${stateLabel}）｜NPB予想リーグ`} /></div>{entries.length ? <ResultsExplorer key={`${year}-${scope}`} entries={entries} target={target} year={year} scope={scope} isFinal={status === "final"} compact={compact} /> : <div className="result-empty"><h3>集計対象の予想・順位を確認中です</h3><p>確定済みの予想と、同一時点の6球団分の実順位が揃うと表示されます。</p><Link href={`/rankings/predictions?year=${year}`}>登録されている予想を見る →</Link></div>}</section>
      <details className="result-method" id="method"><summary>集計ルール・対象人数について</summary><div><p>対象は当サイトに登録された解説者・評論家のロック済み予想です。各リーグ6球団・1〜6位が重複なく揃うものを集計します。総合ではセ・パ両方が必要です。一部リーグのみの予想は該当リーグで比較できます。</p><p>同じ予想者に複数の登録がある場合は、通常版を優先し、登録日時・予想IDが早いものを選びます。結果が良い版への後付けの差し替えはしません。掲載媒体ごとの人物重複がある場合は登録ID単位の人数です。</p><p>順位一致数が多い順、同数なら各球団の予想順位と実順位の差の合計が小さい順です。両方同じなら同順位。この画面の並びは、既存のポイント制スコアボードとは異なります。</p><p>現在の対象 {summary.eligible}人。必要な予想が不完全などで対象外 {summary.excluded}人。外部記事の人数とは母集団が異なります。各リーグの最新の同一時点に6球団が揃い、全件が確定として登録された場合だけ「確定」と表示します。</p><Link href={`/rankings/scoreboard?year=${year}`}>従来のポイント制スコアボードを見る →</Link></div></details>
      <section className="result-discover" aria-labelledby="result-discover-title"><h2 id="result-discover-title">もう一歩、予想を楽しむ。</h2><div className="result-discover-grid">{[{ href: `/rankings/predictions?year=${year}`, number: "01", title: "全員の予想を横並びに", text: "同じ球団を何位に置いた？ 順位予想一覧で比較。" }, { href: `/rankings/titles?year=${year}`, number: "02", title: "個人タイトルの予想も", text: "首位打者・本塁打王などの予想と結果を確認。" }, { href: "/rankings/all-time", number: "03", title: "一度だけ？ 毎年強い？", text: "過去シーズンと通算成績を振り返る。" }].map((card) => <Link href={card.href} key={card.number}><span>{card.number} ↗</span><h3>{card.title}</h3><p>{card.text}</p></Link>)}</div></section>
    </div>
  );
}
