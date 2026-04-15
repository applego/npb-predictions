/**
 * Timing bonus system — earlier predictions get more credit.
 *
 * NPB regular season: late March → early October
 * Predictions before opening day are "blind" = highest bonus.
 * Predictions during the season have more info = lower bonus.
 *
 * Multiplier applied to raw score:
 *   - Jan-Mar (pre-season): 1.0x (full credit)
 *   - April (month 1): 0.9x
 *   - May (month 2): 0.8x
 *   - June-July (mid): 0.6x
 *   - Aug-Sep (late): 0.4x
 *   - Oct+ (post-season): 0.2x (basically copying results)
 */

export interface TimingBonus {
  multiplier: number;
  label: string;
  emoji: string;
}

const TIMING_TABLE: Record<number, TimingBonus> = {
  1:  { multiplier: 1.0, label: "開幕前予想", emoji: "🎯" },
  2:  { multiplier: 1.0, label: "開幕前予想", emoji: "🎯" },
  3:  { multiplier: 1.0, label: "開幕前予想", emoji: "🎯" },
  4:  { multiplier: 0.9, label: "開幕直後", emoji: "⚡" },
  5:  { multiplier: 0.8, label: "序盤戦", emoji: "📊" },
  6:  { multiplier: 0.7, label: "交流戦前後", emoji: "🔄" },
  7:  { multiplier: 0.6, label: "前半戦終了", emoji: "📉" },
  8:  { multiplier: 0.5, label: "後半戦", emoji: "📉" },
  9:  { multiplier: 0.4, label: "終盤戦", emoji: "⏰" },
  10: { multiplier: 0.2, label: "最終盤", emoji: "🚨" },
  11: { multiplier: 0.1, label: "シーズン後", emoji: "💤" },
  12: { multiplier: 0.1, label: "シーズン後", emoji: "💤" },
};

/**
 * Get timing bonus for a prediction made in a given month.
 * Returns multiplier (0.1–1.0) and label.
 */
export function getTimingBonus(month: number): TimingBonus {
  return TIMING_TABLE[month] ?? { multiplier: 0.5, label: "不明", emoji: "❓" };
}

/**
 * Apply timing bonus to a raw score.
 * Returns adjusted score (rounded to 1 decimal).
 */
export function applyTimingBonus(rawScore: number, month: number): number {
  const { multiplier } = getTimingBonus(month);
  return Math.round(rawScore * multiplier * 10) / 10;
}

/**
 * Format timing bonus for display.
 * e.g., "×1.0 開幕前予想 🎯" or "×0.6 前半戦終了 📉"
 */
export function formatTimingBonus(month: number): string {
  const { multiplier, label, emoji } = getTimingBonus(month);
  return `×${multiplier} ${label} ${emoji}`;
}
