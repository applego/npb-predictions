// Client-side Canvas PNG generator for prediction matrices.
// Produces a newspaper-style image: vertical names × rank rows × team color cells.

import { getTeamByName } from "./teams";

export interface PngCol {
  name: string;
  isMe?: boolean;
  picks: { rank: number; teamName: string }[];
}

export function downloadPredictionPng(
  cols: PngCol[],
  league: "central" | "pacific",
  title: string,
): void {
  const dataUrl = renderPredictionCanvas(cols, league, title);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `npb-predictions-${league}-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function renderPredictionCanvas(
  cols: PngCol[],
  league: "central" | "pacific",
  title: string,
): string {
  // ── Layout constants ──
  const SCALE = 2;             // retina
  const CELL_W = 42;
  const CELL_H = 42;
  const RANK_W = 36;
  const PAD = 12;
  const HEADER_H = 52;
  const CHAR_H = 15;
  const CHAR_GAP = 2;
  const FOOTER_H = 20;

  const maxNameLen = Math.max(...cols.map((c) => [...c.name].length), 2);
  const NAME_H = maxNameLen * (CHAR_H + CHAR_GAP) + 10;

  const W = PAD + RANK_W + cols.length * CELL_W + PAD;
  const H = PAD + HEADER_H + NAME_H + 6 * CELL_H + FOOTER_H + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  const JA = "'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans JP', sans-serif";
  const MONO = "'Courier New', monospace";

  // ── Background ──
  ctx.fillStyle = "#0e0e10";
  ctx.fillRect(0, 0, W, H);

  // ── Header ──
  const leagueLabel = league === "central" ? "セ・リーグ" : "パ・リーグ";
  const leagueColor = league === "central" ? "#ef4444" : "#3b82f6";
  const dateStr = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, ".");

  ctx.textBaseline = "alphabetic";
  ctx.font = `bold 15px ${JA}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(title, PAD, PAD + 20);

  ctx.font = `bold 11px ${JA}`;
  ctx.fillStyle = leagueColor;
  ctx.fillText(leagueLabel, PAD, PAD + 38);

  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "right";
  ctx.fillText(`${dateStr} 作成`, W - PAD, PAD + 38);
  ctx.textAlign = "left";

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(PAD, PAD + HEADER_H - 2);
  ctx.lineTo(W - PAD, PAD + HEADER_H - 2);
  ctx.stroke();

  const namesTop = PAD + HEADER_H;
  const gridTop = namesTop + NAME_H;
  const gridLeft = PAD + RANK_W;

  // ── Rank labels ──
  ctx.textAlign = "center";
  for (let r = 1; r <= 6; r++) {
    const midY = gridTop + (r - 1) * CELL_H + CELL_H / 2;
    ctx.font = `${r === 1 ? "bold" : "normal"} 11px ${JA}`;
    ctx.fillStyle = r === 1 ? "#d4a017" : "rgba(255,255,255,0.32)";
    ctx.textBaseline = "middle";
    ctx.fillText(`${r}位`, PAD + RANK_W / 2, midY);
  }
  ctx.textBaseline = "alphabetic";

  // ── Columns ──
  cols.forEach((col, ci) => {
    const cx = gridLeft + ci * CELL_W;
    const center = cx + CELL_W / 2;

    // Background tint for "me" column
    if (col.isMe) {
      ctx.fillStyle = "rgba(239,68,68,0.06)";
      ctx.fillRect(cx, namesTop - 6, CELL_W, NAME_H + 6 * CELL_H + 6);
    }

    // Vertical name characters
    const chars = [...col.name];
    chars.forEach((ch, chi) => {
      const charY = namesTop + chi * (CHAR_H + CHAR_GAP) + CHAR_H;
      ctx.font = `${col.isMe ? "bold" : "normal"} 12px ${JA}`;
      ctx.fillStyle = col.isMe ? "#ef4444" : "rgba(255,255,255,0.80)";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(ch, center, charY);
    });

    // "ME" marker above column
    if (col.isMe) {
      ctx.font = `bold 8px ${MONO}`;
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("▼", center, namesTop - 1);
    }

    // Team cells
    for (let r = 1; r <= 6; r++) {
      const pick = col.picks.find((p) => p.rank === r);
      const team = pick ? getTeamByName(pick.teamName) : null;
      const cy = gridTop + (r - 1) * CELL_H;

      if (team) {
        ctx.fillStyle = team.color;
        ctx.fillRect(cx + 1, cy + 1, CELL_W - 2, CELL_H - 2);

        // Use abbr (1 char) when shortName > 2 chars
        const label =
          team.shortName.length <= 2 ? team.shortName : team.abbr;
        const fontSize =
          label.length === 1 ? 16 : label.length === 2 ? 13 : 10;
        ctx.font = `bold ${fontSize}px ${JA}`;
        ctx.fillStyle = team.textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, center, cy + CELL_H / 2);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(cx + 1, cy + 1, CELL_W - 2, CELL_H - 2);
        ctx.font = `10px ${JA}`;
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("—", center, cy + CELL_H / 2);
      }

      // Cell border
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx + 1, cy + 1, CELL_W - 2, CELL_H - 2);
    }

    // Column separator
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + CELL_W, gridTop);
    ctx.lineTo(cx + CELL_W, gridTop + 6 * CELL_H);
    ctx.stroke();
  });

  // ── Grid horizontal lines ──
  for (let r = 0; r <= 6; r++) {
    const y = gridTop + r * CELL_H;
    ctx.strokeStyle =
      r === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)";
    ctx.lineWidth = r === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
  }

  // ── Footer: commentator count ──
  const footerY = gridTop + 6 * CELL_H + 14;
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`npb-predictions.pages.dev — ${cols.length}人`, PAD, footerY);

  // ── Outer border ──
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD, PAD, W - PAD * 2, H - PAD * 2);

  return canvas.toDataURL("image/png");
}
