"use client";

import { useEffect, useMemo, useState } from "react";
import { recordGrowth } from "@/lib/growth-events";
import { RESULT_LABELS, type ResultLeague } from "@/lib/season-results";
import { getTeamByName, getTeamsByLeague } from "@/lib/teams";
import {
  SHEET_MAX_COMMENTATORS, SHEET_NAME_MAX, scoreOrder, sheetUrl, sortRows,
  type SheetQuery, type SheetRow, type SheetSort,
} from "@/lib/prediction-sheet";

export interface SheetCommentator { userId: number; name: string; source: string | null; order: string[]; result: SheetRow["result"] }

// Rows entered here live only in the URL and carry no trustworthy date (a timestamp in the URL
// could be edited). Once results exist they are reference only: labelled, and kept out of the ranking.
const REFERENCE_LABEL = "参考・入力日の記録なし";
const REFERENCE_NOTE = `${REFERENCE_LABEL}（順位の対象外）`;
/** A display name in the share text must not notify a real X account. */
const noMention = (value: string) => value.replace(/@/g, "＠");

const SORTS: { key: SheetSort; label: string }[] = [
  { key: "points", label: "点数" }, { key: "exact", label: "的中数" }, { key: "deviation", label: "ずれ合計" },
];

export function PredictionSheet({ year, years, league, status, actualOrder, commentators, defaultPicks, initialQuery, unavailable }: {
  year: number; years: number[]; league: ResultLeague; status: "final" | "provisional" | "none";
  actualOrder: string[] | null; commentators: SheetCommentator[]; defaultPicks: number[];
  initialQuery: SheetQuery; unavailable: boolean;
}) {
  const teams = getTeamsByLeague(league);
  const hasResult = actualOrder !== null;
  const [picks, setPicks] = useState<number[]>(initialQuery.picks ?? defaultPicks);
  // Someone else's row arrives through a shared link; the form stays empty for the visitor's own.
  const [shared, setShared] = useState(initialQuery.me);
  const [name, setName] = useState(initialQuery.me ? "" : initialQuery.name ?? "");
  const [order, setOrder] = useState<string[]>([]);
  const [sort, setSort] = useState<SheetSort>(initialQuery.sort);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  const myRow: SheetRow | null = order.length === 6
    ? { key: "me", name: name.trim() || "あなた", isMine: true, order, result: hasResult ? scoreOrder(order, snapshotFrom(actualOrder!, league)) : null }
    : null;
  const sharedRow: SheetRow | null = shared
    ? { key: "shared", name: shared.name, isMine: false, order: shared.order, result: hasResult ? scoreOrder(shared.order, snapshotFrom(actualOrder!, league)) : null }
    : null;
  const rows = useMemo(() => {
    const chosen = picks.map((id) => commentators.find((c) => c.userId === id)).filter((c): c is SheetCommentator => !!c)
      .map((c): SheetRow => ({ key: `c${c.userId}`, name: c.name, source: c.source, isMine: false, order: c.order, result: c.result }));
    const entered = [sharedRow, myRow].filter((r): r is SheetRow => !!r);
    // Entered rows may have been made after seeing the standings, so they never outrank a commentator.
    return hasResult ? [...sortRows(chosen, sort), ...entered] : [...entered, ...chosen];
  }, [picks, commentators, myRow?.name, myRow?.order.join(), sharedRow?.order.join(), sort, hasResult]); // eslint-disable-line react-hooks/exhaustive-deps
  const isEntered = (row: SheetRow) => row.key === "me" || row.key === "shared";

  const duplicateNames = new Set(rows.map((r) => r.name).filter((n, i, all) => all.indexOf(n) !== i));
  const query: SheetQuery = { league, sort, picks, me: myRow ? { name: myRow.name, order } : shared };
  // Keep the address shareable without a server round trip.
  useEffect(() => {
    const url = sheetUrl(window.location.origin, year, query);
    window.history.replaceState(null, "", url.slice(window.location.origin.length));
  }, [year, league, sort, picks.join(), name, order.join(), shared]); // eslint-disable-line react-hooks/exhaustive-deps

  function tapTeam(team: string) {
    setOrder((current) => current.includes(team) ? current.filter((t) => t !== team) : current.length < 6 ? [...current, team] : current);
  }
  function togglePick(id: number) {
    setPicks((current) => current.includes(id) ? current.filter((p) => p !== id) : current.length < SHEET_MAX_COMMENTATORS ? [...current, id] : current);
  }
  function shareHref() {
    const url = sheetUrl(window.location.origin, year, query) + "&utm_source=x";
    const head = `${year}年 ${RESULT_LABELS[league]} 順位予想`;
    const entered = myRow ?? sharedRow;
    const text = entered
      ? `${head}、解説者と並べてみた｜${noMention(entered.name)}${entered.result ? ` 的中${entered.result.exact}・ずれ${entered.result.deviation}・${entered.result.points}点（${REFERENCE_NOTE}）` : ""}`
      : `${head}　解説者の予想一覧`;
    return `https://x.com/intent/post?${new URLSearchParams({ text: `${text}\n#みんなの順位予想対決`, url })}`;
  }
  async function saveImage() {
    setMessage("");
    try {
      await drawSheet({ year, league, status, actualOrder, rows });
      recordGrowth("card_download", year, league);
      setMessage("画像を保存しました。Xの投稿に添付できます。");
    } catch { setMessage("画像を保存できませんでした。リンクを共有してください。"); }
  }

  // Picks belong to one league; the display name follows the visitor across leagues and years.
  const switchHref = (y: number, l: ResultLeague) => `/sheet?${new URLSearchParams({ year: String(y), league: l, ...(name.trim() ? { me: name.trim() } : {}) })}`;
  const short = (team: string) => teams.find((t) => t.name === team)?.shortName ?? team;
  const statusLabel = status === "final" ? "確定" : status === "provisional" ? "暫定" : "結果前";
  const visibleCommentators = commentators.filter((c) => !filter || c.name.includes(filter) || (c.source ?? "").includes(filter));

  return (
    <div className="sheet">
      <header className="sheet-masthead">
        <p className="sheet-kicker">{year}年 {RESULT_LABELS[league]}・{statusLabel}</p>
        <h1>順位予想一覧</h1>
        <p className="sheet-lead">解説者の予想を新聞の予想一覧のように並べ、あなたの予想を加えて画像で保存・共有できます。</p>
        <nav className="sheet-switch" aria-label="年度とリーグ">
          {(["central", "pacific"] as const).map((l) => (
            <a key={l} href={switchHref(year, l)} aria-current={l === league ? "page" : undefined}>{RESULT_LABELS[l]}</a>
          ))}
          {years.length > 1 && (
            <select aria-label="年度" value={year} onChange={(e) => { window.location.href = switchHref(Number(e.target.value), league); }}>
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
          )}
        </nav>
      </header>

      {unavailable && <p className="sheet-alert" role="alert">解説者の予想を読み込めませんでした。時間をおいて開き直してください。</p>}

      <section className="sheet-mine" aria-labelledby="sheet-mine-title">
        <h2 id="sheet-mine-title">あなたの予想を入れる</h2>
        <label className="sheet-field">
          <span>表示名</span>
          <input value={name} maxLength={SHEET_NAME_MAX} aria-describedby="sheet-name-help" onChange={(e) => setName(e.target.value)} />
        </label>
        <p className="sheet-help" id="sheet-name-help">ニックネームやXのアカウント名。共有しても相手に通知は届きません。</p>
        <p className="sheet-help">1位から順に球団を押してください（{order.length}/6）。もう一度押すと外せます。</p>
        <div className="sheet-teams" role="group" aria-label="球団を順位の順に選ぶ">
          {teams.map((team) => {
            const at = order.indexOf(team.name);
            return (
              <button key={team.slug} type="button" aria-pressed={at >= 0} onClick={() => tapTeam(team.name)}
                style={{ "--team": team.color, "--team-ink": team.textColor } as React.CSSProperties}>
                <span className="sheet-team-rank">{at >= 0 ? `${at + 1}位` : "—"}</span>{team.shortName}
              </button>
            );
          })}
        </div>
        {order.length > 0 && <p className="sheet-chosen">選んだ順：{order.map((t, i) => `${i + 1}位 ${short(t)}`).join("・")}</p>}
        {myRow ? (
          <p className="sheet-added" role="status">
            一覧に入りました{myRow.result ? `：的中${myRow.result.exact}・ずれ${myRow.result.deviation}・${myRow.result.points}点（${REFERENCE_NOTE}）` : ""}
            <a href="#sheet-board-title" onClick={(e) => { e.preventDefault(); document.querySelector(".sheet-row-mine")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>一覧で見る ↓</a>
          </p>
        ) : order.length > 0 && <p className="sheet-help" role="status">あと{6 - order.length}球団で一覧に入ります。</p>}
        {order.length > 0 && <button type="button" className="sheet-link-button" onClick={() => setOrder([])}>選び直す</button>}
      </section>

      <section aria-labelledby="sheet-board-title">
        <details className="sheet-picker">
          <summary>並べる解説者を入れ替える（{picks.length}/{SHEET_MAX_COMMENTATORS}人）</summary>
          <input type="search" value={filter} placeholder="名前・番組名で探す" aria-label="解説者を探す" onChange={(e) => setFilter(e.target.value)} />
          <ul>
            {visibleCommentators.map((c) => (
              <li key={c.userId}>
                <label>
                  <input type="checkbox" checked={picks.includes(c.userId)} disabled={!picks.includes(c.userId) && picks.length >= SHEET_MAX_COMMENTATORS} onChange={() => togglePick(c.userId)} />
                  <span>{c.name}</span><small>{[c.source, c.result ? `${c.result.points}点` : null].filter(Boolean).join("・")}</small>
                </label>
              </li>
            ))}
          </ul>
        </details>
        <div className="sheet-board-head">
          <h2 id="sheet-board-title">予想一覧（{rows.length}人）</h2>
          {hasResult && (
            <div className="sheet-sorts" role="group" aria-label="並び順">
              {SORTS.map((s) => <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>{s.label}順</button>)}
            </div>
          )}
        </div>
        <ol className="sheet-board">
          <li className="sheet-row sheet-row-header" aria-hidden="true">
            <span className="sheet-name">予想者</span>
            <span className="sheet-picks">{[1, 2, 3, 4, 5, 6].map((r) => <span key={r}>{r}位</span>)}</span>
            {hasResult && <span className="sheet-metrics"><span>的中</span><span>ずれ</span><span>点</span></span>}
          </li>
          {actualOrder && (
            <li className="sheet-row sheet-row-actual">
              <span className="sheet-name">{status === "final" ? "実際の順位" : "現在の順位"}</span>
              <span className="sheet-picks">{actualOrder.map((t) => <Chip key={t} team={t} />)}</span>
              {hasResult && <span className="sheet-metrics" />}
            </li>
          )}
          {rows.map((row) => (
            <li key={row.key} className={`sheet-row${row.isMine ? " sheet-row-mine" : ""}${row.key === "shared" ? " sheet-row-shared" : ""}`}>
              <span className="sheet-name">{row.key === "shared" ? `${row.name}さん` : row.name}{row.isMine && row.name !== "あなた" && <small>あなた</small>}{isEntered(row) && hasResult && <em className="sheet-after">{REFERENCE_NOTE}</em>}{duplicateNames.has(row.name) && row.source && <em className="sheet-source">{row.source}</em>}</span>
              <span className="sheet-picks">
                {row.order.map((t, i) => {
                  const actual = row.result?.actualRanks[i];
                  const gap = actual === undefined ? null : Math.abs(actual - (i + 1));
                  return <Chip key={t} team={t} hit={gap === 0} gap={gap} label={`${i + 1}位 ${t}${gap === null ? "" : gap === 0 ? " 的中" : ` ${gap}差`}`} />;
                })}
              </span>
              {row.result && (
                <span className="sheet-metrics">
                  <span><b>{row.result.exact}</b><small>的中</small></span>
                  <span><b>{row.result.deviation}</b><small>ずれ</small></span>
                  <span><b>{row.result.points}</b><small>点</small></span>
                </span>
              )}
            </li>
          ))}
          {rows.length === 0 && <li className="sheet-empty">{order.length > 0 ? `あと${6 - order.length}球団であなたの予想が入ります。` : "あなたの予想を入れるか、「並べる解説者を入れ替える」から解説者を選んでください。"}</li>}
        </ol>
        <p className="sheet-legend">{hasResult ? "赤枠＝的中、1差〜5差＝実際の順位とのずれ（3差以上は減点）。点数は的中5点・1差3点・2差1点・3差−1点・4差−3点・5差−5点。ここで入れた予想は入力日を記録していないため、解説者の後ろに参考として並びます。" : "結果が出ると、的中とずれがここに入ります。"}</p>
        {sharedRow && <button type="button" className="sheet-link-button" onClick={() => setShared(null)}>{sharedRow.name}さんの予想を外す</button>}
      </section>

      <div className="sheet-actions">
        <button type="button" className="result-button sheet-primary" onClick={saveImage} disabled={rows.length === 0}>一覧を画像で保存 ↓</button>
        <button type="button" className="result-button result-button-secondary" disabled={rows.length === 0} onClick={() => { recordGrowth("x_share_start", year, league); window.open(shareHref(), "_blank", "noopener"); }}>Xで共有する</button>
        <p role="status">{rows.length === 0 ? "一覧に1人以上入ると、保存と共有ができます。" : message}</p>
      </div>

    </div>
  );
}

function Chip({ team, hit = false, gap = null, label }: { team: string; hit?: boolean; gap?: number | null; label?: string }) {
  const t = getTeamByName(team);
  return (
    <span className={`sheet-chip${hit ? " is-hit" : ""}${gap !== null && gap >= 3 ? " is-far" : ""}`} aria-label={label ?? team} title={label ?? team}
      style={{ "--team": t?.color ?? "#999", "--team-ink": t?.textColor ?? "#fff" } as React.CSSProperties}>
      <span className="sheet-chip-face">{t?.abbr ?? team.slice(0, 1)}</span>
      {gap !== null && <span className="sheet-chip-gap">{gap === 0 ? "的中" : `${gap}差`}</span>}
    </span>
  );
}

function snapshotFrom(actualOrder: string[], league: ResultLeague) {
  return {
    league, status: "final" as const, updatedAt: null, stale: false,
    rows: actualOrder.map((teamName, i) => ({ league, rank: i + 1, teamName, snapshotDate: "", isFinal: true })),
  };
}

/** Rendered on the device; the sheet never goes to an image service. */
async function drawSheet({ year, league, status, actualOrder, rows }: {
  year: number; league: ResultLeague; status: "final" | "provisional" | "none"; actualOrder: string[] | null; rows: SheetRow[];
}) {
  await document.fonts.ready;
  const hasResult = actualOrder !== null;
  const W = 1200, top = 268, rowH = 96, list = actualOrder ? [{ name: status === "final" ? "実際の順位" : "現在の順位", order: actualOrder, actual: true, row: null as SheetRow | null }] : [];
  const entered = (row: SheetRow) => row.key === "me" || row.key === "shared";
  for (const row of rows) list.push({ name: row.isMine && row.name === "あなた" ? "わたし" : row.name, order: row.order, actual: false, row });
  const H = top + list.length * rowH + 110;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  const font = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
  const ink = "#1b1b18", muted = "#6c6a62", paper = "#faf8f1", rule = "#1b1b18";
  const text = (value: string, x: number, y: number, size: number, color = ink, weight = 600, width = 400, align: CanvasTextAlign = "left") => {
    let fitted = size;
    do { ctx.font = `${weight} ${fitted}px ${font}`; } while (ctx.measureText(value).width > width && --fitted > 12);
    ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y); ctx.textAlign = "left";
  };
  const name = (row: SheetRow) => row.name === "あなた" ? "わたし" : `${row.name}さん`;
  // Wrap long names onto two lines instead of shrinking them below a readable size.
  // The image is seen by other people, so it marks entered rows as reference instead of "you".
  const nameLines = (value: string, y: number, actual: boolean, isEntered: boolean) => {
    const maxW = 206, size = 26;
    ctx.font = `800 ${size}px ${font}`;
    const lines: string[] = [];
    let line = "";
    for (const ch of value) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
    }
    lines.push(line);
    const shown = lines.slice(0, 2);
    if (lines.length > 2) shown[1] = shown[1].slice(0, -1) + "…";
    const startY = shown.length === 1 ? y + 44 : y + 30;
    shown.forEach((l, i) => text(l, 52, startY + i * 30, size, ink, actual ? 700 : 800, maxW));
    if (isEntered && hasResult) text(REFERENCE_LABEL, 52, y + 80, 15, "#7a4d00", 700, maxW);
  };
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rule; ctx.fillRect(40, 36, W - 80, 6); ctx.fillRect(40, 48, W - 80, 2);
  text("みんなの順位予想対決", 40, 92, 24, muted, 700, 500);
  text(`${year}年 ${RESULT_LABELS[league]}　順位予想一覧`, 40, 146, 46, ink, 900, 1120);
  const mine = rows.find((r) => r.isMine) ?? rows.find(entered);
  const others = rows.filter((r) => !entered(r)).length;
  const who = mine ? (name(mine) + (others > 0 ? "と解説者の予想" : "の予想")) : "解説者の予想";
  const sub = [who, hasResult ? (status === "final" ? "確定順位で答え合わせ" : "暫定順位で答え合わせ") : "", mine && hasResult ? "解説者以外は入力日の記録がない参考" : ""].filter(Boolean).join("　／　");
  text(sub, 40, 190, 24, muted, 700, 1120);
  const nameW = 230, chipX = 40 + nameW, chipW = hasResult ? 108 : 140, metricsX = chipX + chipW * 6 + 16;
  ctx.fillStyle = rule; ctx.fillRect(40, top - 30, W - 80, 2);
  [1, 2, 3, 4, 5, 6].forEach((r, i) => text(`${r}位`, chipX + chipW * i + chipW / 2, top - 40, 20, muted, 700, chipW, "center"));
  if (hasResult) ["的中", "ずれ", "点"].forEach((label, i) => text(label, metricsX + i * 72 + 36, top - 40, 20, muted, 700, 72, "center"));
  list.forEach((item, index) => {
    const y = top + index * rowH;
    if (item.row && entered(item.row)) { ctx.fillStyle = "#fff4d6"; ctx.fillRect(40, y - 8, W - 80, rowH); }
    if (item.actual) { ctx.fillStyle = "#ecebe3"; ctx.fillRect(40, y - 8, W - 80, rowH); }
    nameLines(item.name, y, item.actual, item.row ? entered(item.row) : false);
    item.order.forEach((team, i) => {
      const t = getTeamByName(team), cx = chipX + chipW * i + chipW / 2, cy = y + 34;
      const actual = item.row?.result?.actualRanks[i], gap = actual === undefined ? null : Math.abs(actual - (i + 1));
      ctx.beginPath(); ctx.roundRect(cx - 32, cy - 24, 64, 48, 8); ctx.fillStyle = t?.color ?? "#999"; ctx.fill();
      text(t?.abbr ?? team.slice(0, 1), cx, cy + 10, 28, t?.textColor ?? "#fff", 800, 58, "center");
      // Ring around the chip, like the on-screen sheet; kept clear of the label below.
      if (gap === 0) { ctx.beginPath(); ctx.roundRect(cx - 38, cy - 30, 76, 60, 11); ctx.lineWidth = 4; ctx.strokeStyle = "#c62828"; ctx.stroke(); }
      if (gap !== null) text(gap === 0 ? "的中" : `${gap}差`, cx, cy + 52, 18, gap === 0 ? "#c62828" : gap >= 3 ? ink : muted, 700, chipW, "center");
    });
    const r = item.row?.result;
    if (r) [r.exact, r.deviation, r.points].forEach((v, i) => text(String(v), metricsX + i * 72 + 36, y + 48, 32, i === 0 ? "#c62828" : ink, 800, 70, "center"));
    ctx.fillStyle = "#d8d5ca"; ctx.fillRect(40, y + rowH - 8, W - 80, 1);
  });
  ctx.fillStyle = rule; ctx.fillRect(0, H - 64, W, 64);
  text(hasResult ? "赤枠＝的中　1差〜5差＝順位のずれ（3差以上は減点）" : "結果が出たら答え合わせ", 40, H - 24, 20, "#ffffff", 600, 600);
  text("npb-predictions.pages.dev/sheet", W - 40, H - 24, 20, "#ffffff", 600, 520, "right");
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("encode failed")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `npb-${year}-${league}-sheet.png`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
