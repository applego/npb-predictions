"use client";

import { useRef, useState, useCallback } from "react";
import { getTeamByName } from "@/lib/teams";

interface Props {
  userName: string;
  year: number;
  league: "central" | "pacific";
  picks: string[]; // 6 team names in order
}

/**
 * Personal prediction card — like a baseball card for predictions.
 * Rendered via Canvas API (client-side, $0).
 * Style: gold border, team colors, compact vertical layout.
 */
export function PredictionCard({ userName, year, league, picks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 400;
    const H = 560;
    canvas.width = W;
    canvas.height = H;

    // ── Background ──
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    // ── Gold border ──
    const borderW = 6;
    ctx.strokeStyle = "#D4A017";
    ctx.lineWidth = borderW;
    ctx.strokeRect(borderW / 2, borderW / 2, W - borderW, H - borderW);

    // Inner gold line
    ctx.strokeStyle = "rgba(212,160,23,0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    // ── Header ──
    const headerH = 80;
    const headerGrad = ctx.createLinearGradient(0, 0, W, 0);
    headerGrad.addColorStop(0, "#B8860B");
    headerGrad.addColorStop(0.5, "#D4A017");
    headerGrad.addColorStop(1, "#B8860B");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(16, 16, W - 32, headerH);

    // Header text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${userName}`, W / 2, 48);

    ctx.font = "bold 16px 'Noto Sans JP', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`${year}年 ${league === "central" ? "セ・リーグ" : "パ・リーグ"} 予想`, W / 2, 78);

    // ── Rank rows ──
    const startY = headerH + 28;
    const rowH = 64;
    const labels = ["優勝", "2位", "3位", "4位", "5位", "6位"];
    const rankColors = ["#CC0000", "#333", "#333", "#555", "#555", "#555"];
    const rankBgColors = [
      "rgba(204,0,0,0.15)",
      "rgba(255,255,255,0.05)",
      "rgba(255,255,255,0.05)",
      "rgba(255,255,255,0.03)",
      "rgba(255,255,255,0.03)",
      "rgba(255,255,255,0.02)",
    ];

    for (let i = 0; i < 6; i++) {
      const y = startY + i * rowH;
      const team = getTeamByName(picks[i]);

      // Row background
      ctx.fillStyle = rankBgColors[i];
      ctx.fillRect(24, y, W - 48, rowH - 4);

      // Rank label
      ctx.fillStyle = i === 0 ? "#D4A017" : "rgba(255,255,255,0.5)";
      ctx.font = i === 0 ? "bold 20px 'Noto Sans JP', sans-serif" : "bold 16px 'Noto Sans JP', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(labels[i], 36, y + rowH / 2 + 6);

      // Team color block
      if (team) {
        const blockX = 110;
        const blockW = W - 48 - blockX + 24;
        const blockH = rowH - 12;
        const blockY = y + 4;

        // Team color background
        ctx.fillStyle = team.color;
        roundRect(ctx, blockX, blockY, blockW, blockH, 6);
        ctx.fill();

        // Team name
        ctx.fillStyle = team.textColor;
        ctx.font = "bold 28px 'Noto Sans JP', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Text shadow for white text
        if (team.textColor === "#fff") {
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur = 4;
        }
        ctx.fillText(team.shortName, blockX + blockW / 2, blockY + blockH / 2);
        ctx.shadowBlur = 0;
        ctx.textBaseline = "alphabetic";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "bold 24px 'Noto Sans JP', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(picks[i] ?? "---", W / 2 + 40, y + rowH / 2 + 8);
      }
    }

    // ── Footer ──
    ctx.fillStyle = "rgba(212,160,23,0.6)";
    ctx.font = "10px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NPB 予想リーグ — npb-predictions.pages.dev", W / 2, H - 20);

    setGenerated(true);
  }, [userName, year, league, picks]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `npb-${userName}-${year}-${league}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const shareX = () => {
    const leagueLabel = league === "central" ? "セ・リーグ" : "パ・リーグ";
    const text = `${year}年${leagueLabel}順位予想\n優勝: ${picks[0]}\n\n#NPB予想リーグ #プロ野球`;
    const url = `https://npb-predictions.pages.dev/rankings/predictions?year=${year}&league=${league}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        className="mx-auto rounded-lg"
        style={{ maxWidth: "100%", height: "auto", display: generated ? "block" : "none" }}
      />

      <div className="flex flex-wrap gap-2">
        {!generated ? (
          <button
            type="button"
            onClick={draw}
            className="rounded-sm px-4 py-2 text-sm font-medium"
            style={{ background: "var(--stitch)", color: "#fff" }}
          >
            🎴 カードを生成
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={download}
              className="rounded-sm px-3 py-1.5 text-xs font-medium"
              style={{ border: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}
            >
              💾 保存
            </button>
            <button
              type="button"
              onClick={shareX}
              className="rounded-sm px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--stitch)", color: "#fff" }}
            >
              𝕏 シェア
            </button>
            <button
              type="button"
              onClick={draw}
              className="rounded-sm px-3 py-1.5 text-xs font-medium"
              style={{ border: "1px solid var(--border-primary)", color: "var(--text-muted)" }}
            >
              🔄
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
