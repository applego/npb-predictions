export type PredictionWindowSeason = {
  isActive: boolean;
  lockDate: Date | string | number | null;
};

export type PredictionWindowStatus =
  | { allowed: true }
  | { allowed: false; reason: "inactive" | "locked" };

function toTime(value: PredictionWindowSeason["lockDate"]): number | null {
  if (value === null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getPredictionWindowStatus(
  season: PredictionWindowSeason,
  now: Date = new Date(),
): PredictionWindowStatus {
  if (season.isActive !== true) {
    return { allowed: false, reason: "inactive" };
  }

  const lockTime = toTime(season.lockDate);
  if (lockTime !== null && lockTime <= now.getTime()) {
    return { allowed: false, reason: "locked" };
  }

  return { allowed: true };
}

export function predictionWindowErrorMessage(reason: "inactive" | "locked"): string {
  if (reason === "inactive") {
    return "Predictions can only be submitted for the active season";
  }
  return "Predictions are locked for this season";
}
