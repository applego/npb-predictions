"use client";

import { useRef, useCallback, useState } from "react";
import { getTeamByName } from "@/lib/teams";
import { getTwitterShareUrl } from "@/lib/share";

interface DrawProps {
  userName: string;
  year: number;
  centralPicks: string[]; // shortName array, 1st to 6th
  pacificPicks: string[]; // shortName array, 1st to 6th
  article: { headline: string; subtext: string };
}

interface PredictionImageGeneratorProps extends DrawProps {
  userId: number;
}

// Canvas constants
const W = 1200;
const H = 630;
const BG_COLOR = "#FFFDF5";
const RED_ACCENT = "#E53935";
const DARK_TEXT = "#1A1A1A";
const MUTED_TEXT = "#6B7280";

/**
 * Draw a rounded rectangle on a canvas context.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

/**
 * Draw the newspaper-style prediction image to a canvas.
 */
function drawPredictionImage(
  canvas: HTMLCanvasElement,
  props: DrawProps,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Top red bar
  ctx.fillStyle = RED_ACCENT;
  ctx.fillRect(0, 0, W, 6);

  // Header: "NPB PREDICTIONS LEAGUE"
  ctx.fillStyle = RED_ACCENT;
  ctx.font = "bold 16px 'Helvetica Neue', Arial, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.textAlign = "left";
  ctx.fillText("NPB PREDICTIONS LEAGUE", 40, 40);
  ctx.letterSpacing = "0px";

  // Year badge
  ctx.fillStyle = RED_ACCENT;
  roundRect(ctx, W - 140, 18, 100, 32, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${props.year}`, W - 90, 41);

  // Divider line
  ctx.strokeStyle = "#E5E5E5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 56);
  ctx.lineTo(W - 40, 56);
  ctx.stroke();

  // Headline — split into lines if too long
  ctx.fillStyle = DARK_TEXT;
  ctx.font = "bold 32px 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.textAlign = "left";
  const headlineLines = wrapText(ctx, props.article.headline, W - 80);
  let headY = 94;
  for (const line of headlineLines) {
    ctx.fillText(line, 40, headY);
    headY += 40;
  }

  // Subtext
  ctx.fillStyle = MUTED_TEXT;
  ctx.font = "16px 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  const subtextLines = wrapText(ctx, props.article.subtext, W - 80);
  let subY = headY + 8;
  for (const line of subtextLines) {
    ctx.fillText(line, 40, subY);
    subY += 24;
  }

  // Rankings section starts below the text
  const rankingsY = Math.max(subY + 24, 240);

  // Central League
  drawLeagueRankings(ctx, 40, rankingsY, "CENTRAL", props.centralPicks);

  // Pacific League
  drawLeagueRankings(ctx, W / 2 + 20, rankingsY, "PACIFIC", props.pacificPicks);

  // Footer
  ctx.fillStyle = "#E5E5E5";
  ctx.fillRect(40, H - 60, W - 80, 1);

  // User attribution
  ctx.fillStyle = MUTED_TEXT;
  ctx.font = "14px 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Predicted by ${props.userName}`, 40, H - 28);

  // URL branding
  ctx.textAlign = "right";
  ctx.fillStyle = RED_ACCENT;
  ctx.font = "bold 13px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("#NPB予想リーグ", W - 40, H - 28);
}

/**
 * Draw a league column of ranked team badges.
 */
function drawLeagueRankings(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  picks: string[],
) {
  const colW = 520;

  // League header
  ctx.fillStyle = label === "CENTRAL" ? "#1565C0" : "#00695C";
  roundRect(ctx, x, y, colW, 30, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px 'Helvetica Neue', Arial, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.textAlign = "center";
  ctx.fillText(label, x + colW / 2, y + 20);
  ctx.letterSpacing = "0px";

  // Team rows
  const rowH = 42;
  const startY = y + 40;

  for (let i = 0; i < picks.length && i < 6; i++) {
    const team = getTeamByName(picks[i]);
    const rowY = startY + i * rowH;
    const isEven = i % 2 === 0;

    // Alternating row background
    ctx.fillStyle = isEven ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.05)";
    roundRect(ctx, x, rowY, colW, rowH - 4, 3);
    ctx.fill();

    // Rank number
    ctx.fillStyle = i === 0 ? RED_ACCENT : MUTED_TEXT;
    ctx.font = `bold ${i === 0 ? 22 : 18}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}`, x + 24, rowY + (rowH - 4) / 2 + 6);

    // Team color badge
    if (team) {
      ctx.fillStyle = team.color;
      roundRect(ctx, x + 48, rowY + 6, colW - 70, rowH - 16, 4);
      ctx.fill();

      // Team name on badge
      ctx.fillStyle = team.textColor;
      ctx.font = `bold ${i === 0 ? 20 : 17}px 'Hiragino Sans', 'Noto Sans JP', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(team.shortName, x + 64, rowY + (rowH - 4) / 2 + 6);

      // Full name (smaller, right-aligned)
      ctx.font = "12px 'Hiragino Sans', 'Noto Sans JP', sans-serif";
      ctx.textAlign = "right";
      ctx.globalAlpha = 0.7;
      ctx.fillText(team.name, x + colW - 16, rowY + (rowH - 4) / 2 + 5);
      ctx.globalAlpha = 1.0;
    } else {
      // Fallback for unknown team
      ctx.fillStyle = "#ddd";
      roundRect(ctx, x + 48, rowY + 6, colW - 70, rowH - 16, 4);
      ctx.fill();
      ctx.fillStyle = DARK_TEXT;
      ctx.font = "bold 17px 'Hiragino Sans', 'Noto Sans JP', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(picks[i], x + 64, rowY + (rowH - 4) / 2 + 6);
    }
  }
}

/**
 * Wrap text into lines that fit within maxWidth.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const chars = [...text];
  const lines: string[] = [];
  let current = "";

  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export default function PredictionImageGenerator({
  userId,
  userName,
  year,
  centralPicks,
  pacificPicks,
  article,
}: PredictionImageGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawPredictionImage(canvas, {
      userName,
      year,
      centralPicks,
      pacificPicks,
      article,
    });
    setGenerated(true);
  }, [userName, year, centralPicks, pacificPicks, article]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `npb-prediction-${userName}-${year}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [userName, year]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    const twitterUrl = getTwitterShareUrl("prediction", { userId, year, userName });

    // Try Web Share API with image file (works on mobile / modern browsers)
    if (canvas && typeof navigator !== "undefined" && navigator.canShare) {
      await new Promise<void>((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { resolve(); return; }
          const file = new File([blob], `npb-prediction-${userName}-${year}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: "NPB予想リーグ", text: `${userName}の${year}年プロ野球順位予想 #NPB予想リーグ` });
              resolve();
              return;
            } catch {
              // cancelled or failed → fall through
            }
          }
          resolve();
        }, "image/png");
      });
    }

    // Desktop fallback: download image then open X compose
    if (canvas) {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `npb-prediction-${userName}-${year}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    }
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  }, [userId, userName, year]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Hidden canvas for generation */}
      <canvas
        ref={canvasRef}
        style={{
          display: generated ? "block" : "none",
          width: "100%",
          maxWidth: "600px",
          height: "auto",
          borderRadius: "0.5rem",
          border: "1px solid var(--border-primary)",
        }}
      />

      {!generated ? (
        <button
          onClick={handleGenerate}
          style={{
            background: "transparent",
            color: "var(--stitch)",
            border: "1px solid var(--stitch)",
            borderRadius: "0.375rem",
            padding: "0.375rem 0.75rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          画像を生成する
        </button>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={handleSave}
            style={{
              background: "var(--stitch)",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            画像を保存
          </button>
          <button
            onClick={handleShare}
            style={{
              background: "var(--text-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Xでシェア
          </button>
          <button
            onClick={handleGenerate}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-primary)",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            再生成
          </button>
        </div>
      )}
    </div>
  );
}
