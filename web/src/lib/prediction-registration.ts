import { getPredictionWindowStatus } from "./prediction-window";

/**
 * fixed  = locked; the registered time is the proof that it was made before the season.
 * open   = still editable until the lock time.
 * closed = no longer editable but not fixed (e.g. the season closed without a lock time).
 */
export type RegistrationState = "fixed" | "open" | "closed";

type When = Date | string | number;

export function toDate(value: When | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function registrationState(
  prediction: { isLocked?: boolean | null },
  season: { isActive?: boolean | null; lockDate?: When | null } | undefined,
  now: Date = new Date(),
): RegistrationState {
  if (prediction.isLocked) return "fixed";
  if (season && getPredictionWindowStatus({ isActive: season.isActive ?? false, lockDate: toDate(season.lockDate) }, now).allowed) return "open";
  return "closed";
}

const JST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Tokyo" };

/** "2026年3月25日 21:05" (always Japan time, the season's own clock). */
export function formatRegisteredAt(value: When, withTime = true): string {
  const date = toDate(value);
  if (!date) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("ja-JP", { ...JST, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(date).map((p) => [p.type, p.value]));
  const day = `${parts.year}年${parts.month}月${parts.day}日`;
  return withTime ? `${day} ${parts.hour}:${parts.minute}` : day;
}

/** "開幕前の3/25に登録・固定" for tight places such as a share text. */
export function shortRegisteredAt(value: When): string {
  const date = toDate(value);
  if (!date) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("ja-JP", { ...JST, month: "numeric", day: "numeric" }).formatToParts(date).map((p) => [p.type, p.value]));
  return `開幕前の${parts.month}/${parts.day}に登録・固定`;
}

/** "2026年3月25日登録・開幕前に固定" for a row or a picture. */
export function fixedLabel(value: When): string {
  const day = formatRegisteredAt(value, false);
  return day ? `${day}登録・開幕前に固定` : "";
}

/**
 * The saved time, only when it proves the prediction was made before the season: locked, the
 * lock time on record, and no change after it. Everything shown as "registered" uses this rule.
 */
export function provableRegistration(p: { isLocked?: boolean | null; registeredAt?: When | null; lockedAt?: When | null }): string | null {
  const registered = toDate(p.registeredAt);
  const locked = toDate(p.lockedAt);
  if (!p.isLocked || !registered || !locked || registered.getTime() > locked.getTime()) return null;
  return registered.toISOString();
}
