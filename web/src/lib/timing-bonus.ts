/**
 * Timing Bonus — continuous formula for prediction timing credit.
 *
 * Concept:
 *   Pre-season predictions (before opening day) get full credit.
 *   Once the season starts, information increases → credit decays.
 *   Decay is fast early (first month reveals a lot) then gradual.
 *
 * Formula:
 *   if date <= openingDay:
 *     multiplier = 1.0
 *   else:
 *     progress = daysSinceOpening / seasonLength   (0.0 → 1.0)
 *     multiplier = max(MIN_MULT, 1.0 - DECAY_RANGE * sqrt(progress))
 *
 * sqrt(progress) gives concave decay:
 *   - 1 week in (~3%):   ×0.85  (still good)
 *   - 1 month (~17%):    ×0.63  (significant penalty)
 *   - All-Star (~50%):   ×0.36  (heavy penalty)
 *   - September (~83%):  ×0.18  (almost no credit)
 *   - Season end (100%): ×0.10  (minimum)
 *
 * Why sqrt? Information gain is front-loaded in baseball:
 *   - Week 1-2: starting pitchers' form, lineup changes
 *   - Month 1: team tendencies emerge
 *   - Month 2+: standings stabilize
 */

// ── Constants ──

/** Approximate NPB opening day (March 28) as day-of-year */
const OPENING_DAY_DOY = 87; // March 28

/** Season length in days (March 28 → Sept 25 ≈ 181 days) */
const SEASON_LENGTH = 181;

/** Maximum decay range (1.0 - MIN = 0.9) */
const DECAY_RANGE = 0.9;

/** Minimum multiplier (even post-season gets some credit) */
const MIN_MULT = 0.1;

// ── Core formula ──

export interface TimingBonus {
  /** Score multiplier 0.1–1.0 */
  multiplier: number;
  /** Human label */
  label: string;
  /** Days since opening (negative = before opening) */
  daysSinceOpening: number;
  /** Season progress 0.0–1.0 (clamped) */
  progress: number;
}

/**
 * Calculate timing bonus from a prediction date.
 *
 * @param predictionDate - when the prediction was submitted
 * @param year - season year (to determine opening day)
 */
export function calcTimingBonus(predictionDate: Date, year: number): TimingBonus {
  const openingDay = new Date(year, 2, 28); // March 28
  const diffMs = predictionDate.getTime() - openingDay.getTime();
  const daysSinceOpening = diffMs / (1000 * 60 * 60 * 24);

  if (daysSinceOpening <= 0) {
    // Pre-season: full credit
    return {
      multiplier: 1.0,
      label: formatLabel(daysSinceOpening),
      daysSinceOpening: Math.round(daysSinceOpening),
      progress: 0,
    };
  }

  // Season in progress
  const progress = Math.min(1.0, daysSinceOpening / SEASON_LENGTH);
  const multiplier = Math.max(MIN_MULT, 1.0 - DECAY_RANGE * Math.sqrt(progress));
  const rounded = Math.round(multiplier * 100) / 100;

  return {
    multiplier: rounded,
    label: formatLabel(daysSinceOpening),
    daysSinceOpening: Math.round(daysSinceOpening),
    progress: Math.round(progress * 1000) / 1000,
  };
}

/**
 * Convenience: calculate from month number (for scraped data without exact dates).
 * Assumes prediction was made on the 15th of the month.
 */
export function calcTimingBonusFromMonth(month: number, year: number): TimingBonus {
  const date = new Date(year, month - 1, 15);
  return calcTimingBonus(date, year);
}

/**
 * Apply timing bonus to a raw score.
 */
export function applyTimingBonus(rawScore: number, multiplier: number): number {
  return Math.round(rawScore * multiplier * 10) / 10;
}

/**
 * Format multiplier for display: "×0.85"
 */
export function formatMultiplier(multiplier: number): string {
  return `×${multiplier.toFixed(2)}`;
}

// ── Label helpers ──

function formatLabel(daysSinceOpening: number): string {
  if (daysSinceOpening <= -30) return "開幕1ヶ月以上前";
  if (daysSinceOpening <= -7) return "開幕前";
  if (daysSinceOpening <= 0) return "開幕直前";
  if (daysSinceOpening <= 7) return "開幕1週間";
  if (daysSinceOpening <= 30) return "序盤戦";
  if (daysSinceOpening <= 60) return "前半戦";
  if (daysSinceOpening <= 90) return "交流戦後";
  if (daysSinceOpening <= 120) return "後半戦";
  if (daysSinceOpening <= 150) return "終盤戦";
  if (daysSinceOpening <= 181) return "最終盤";
  return "シーズン後";
}

// ── Reference table for documentation ──

/**
 * Generate a reference table showing multiplier at key points.
 * Useful for display on settings/about pages.
 */
export function generateReferenceTable(year: number = 2026): Array<{
  date: string;
  daysSinceOpening: number;
  multiplier: number;
  label: string;
}> {
  const points = [
    new Date(year, 0, 15),   // Jan 15
    new Date(year, 1, 15),   // Feb 15
    new Date(year, 2, 1),    // Mar 1
    new Date(year, 2, 15),   // Mar 15
    new Date(year, 2, 27),   // Mar 27 (day before opening)
    new Date(year, 2, 28),   // Mar 28 (opening day)
    new Date(year, 3, 4),    // Apr 4 (1 week)
    new Date(year, 3, 15),   // Apr 15
    new Date(year, 3, 28),   // Apr 28 (1 month)
    new Date(year, 4, 28),   // May 28 (2 months)
    new Date(year, 5, 28),   // Jun 28 (3 months)
    new Date(year, 6, 15),   // Jul 15 (All-Star)
    new Date(year, 7, 28),   // Aug 28 (5 months)
    new Date(year, 8, 25),   // Sep 25 (season end)
    new Date(year, 9, 15),   // Oct 15 (post-season)
  ];

  return points.map((d) => {
    const bonus = calcTimingBonus(d, year);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      daysSinceOpening: bonus.daysSinceOpening,
      multiplier: bonus.multiplier,
      label: bonus.label,
    };
  });
}
