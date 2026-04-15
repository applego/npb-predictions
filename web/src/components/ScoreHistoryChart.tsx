"use client";

export interface ScoreHistoryEntry {
  year: number;
  totalScore: number;
  rankingScore: number;
  titleScore: number;
}

const BAR_W = 34;
const BAR_GAP = 26;
const CHART_H = 80;
const TOP_PAD = 26;
const BOTTOM_PAD = 26;
const SIDE_PAD = 6;

export function ScoreHistoryChart({ history }: { history: ScoreHistoryEntry[] }) {
  if (history.length === 0) return null;

  const n = history.length;
  const w = SIDE_PAD * 2 + n * (BAR_W + BAR_GAP) - BAR_GAP;
  const h = TOP_PAD + CHART_H + BOTTOM_PAD;

  const scores = history.map((e) => e.totalScore);
  const maxScore = Math.max(...scores, 0);
  const minScore = Math.min(...scores, 0);
  const range = maxScore - minScore || 1;

  // Y coordinate in SVG space for a given score
  function scoreToY(score: number) {
    const frac = (score - minScore) / range;
    return TOP_PAD + CHART_H * (1 - frac);
  }

  const zeroY = scoreToY(0);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{
        width: "100%",
        maxWidth: `${Math.max(w * 2.2, 280)}px`,
        height: "auto",
        display: "block",
      }}
      aria-label="年度別スコア推移"
    >
      {/* Zero baseline */}
      <line
        x1={SIDE_PAD}
        y1={zeroY}
        x2={w - SIDE_PAD}
        y2={zeroY}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.8"
      />

      {history.map((entry, i) => {
        const x = SIDE_PAD + i * (BAR_W + BAR_GAP);
        const midX = x + BAR_W / 2;
        const isPositive = entry.totalScore >= 0;
        const topY = scoreToY(entry.totalScore);
        const barTop = isPositive ? topY : zeroY;
        const barH = Math.max(Math.abs(topY - zeroY), 2);
        const labelY = isPositive ? barTop - 5 : barTop + barH + 13;

        return (
          <g key={entry.year}>
            {/* Bar */}
            <rect
              x={x}
              y={barTop}
              width={BAR_W}
              height={barH}
              rx="3"
              fill={isPositive ? "rgba(229,57,53,0.75)" : "rgba(100,116,139,0.5)"}
            />
            {/* Ranking score fill (lighter shade at bottom of positive bar) */}
            {isPositive && entry.rankingScore > 0 && (
              <rect
                x={x}
                y={scoreToY(entry.rankingScore)}
                width={BAR_W}
                height={Math.abs(scoreToY(entry.rankingScore) - zeroY)}
                rx="3"
                fill="rgba(229,57,53,0.4)"
              />
            )}

            {/* Score label */}
            <text
              x={midX}
              y={labelY}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--font-display, 'Bebas Neue', Impact, sans-serif)"
              fill={isPositive ? "rgba(229,57,53,0.9)" : "rgba(148,163,184,0.7)"}
            >
              {entry.totalScore > 0 ? `+${entry.totalScore}` : entry.totalScore}
            </text>

            {/* Year label */}
            <text
              x={midX}
              y={h - 5}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.35)"
            >
              {entry.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
