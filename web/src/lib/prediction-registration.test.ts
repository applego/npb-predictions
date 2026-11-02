import { describe, expect, it } from "vitest";
import { fixedLabel, formatRegisteredAt, provableRegistration, registrationState, shortRegisteredAt } from "./prediction-registration";

const NOW = new Date("2027-03-01T00:00:00Z");

describe("registrationState", () => {
  it("is fixed once locked, whatever the season says", () => {
    expect(registrationState({ isLocked: true }, { isActive: true, lockDate: null }, NOW)).toBe("fixed");
  });
  it("is open while the season accepts edits", () => {
    expect(registrationState({ isLocked: false }, { isActive: true, lockDate: "2027-03-26T09:00:00Z" }, NOW)).toBe("open");
    expect(registrationState({ isLocked: false }, { isActive: true, lockDate: null }, NOW)).toBe("open");
  });
  it("is closed after the lock time or when the season is over", () => {
    expect(registrationState({ isLocked: false }, { isActive: true, lockDate: "2027-02-01T00:00:00Z" }, NOW)).toBe("closed");
    expect(registrationState({ isLocked: false }, { isActive: false, lockDate: null }, NOW)).toBe("closed");
    expect(registrationState({ isLocked: false }, undefined, NOW)).toBe("closed");
  });
});

describe("provableRegistration", () => {
  const saved = "2027-03-20T03:00:00.000Z", lock = "2027-03-26T09:00:00.000Z";
  it("gives the saved time only for a row locked with its lock time on record and unchanged since", () => {
    expect(provableRegistration({ isLocked: true, registeredAt: saved, lockedAt: lock })).toBe(saved);
    expect(provableRegistration({ isLocked: true, registeredAt: lock, lockedAt: lock })).toBe(lock);
  });
  it("gives nothing while editable, when locked by hand, or when changed after the lock", () => {
    expect(provableRegistration({ isLocked: false, registeredAt: saved, lockedAt: null })).toBeNull();
    expect(provableRegistration({ isLocked: true, registeredAt: saved, lockedAt: null })).toBeNull();
    expect(provableRegistration({ isLocked: true, registeredAt: "2027-03-27T00:00:00Z", lockedAt: lock })).toBeNull();
  });
});

describe("formatRegisteredAt", () => {
  it("shows Japan time from ISO strings and unix seconds", () => {
    // 2027-03-25 12:05 UTC = 21:05 JST
    expect(formatRegisteredAt("2027-03-25T12:05:00Z")).toBe("2027年3月25日 21:05");
    expect(formatRegisteredAt(Date.UTC(2027, 2, 25, 15, 30) / 1000, false)).toBe("2027年3月26日");
    expect(shortRegisteredAt("2027-03-25T16:00:00Z")).toBe("開幕前の3/26に登録・固定");
    expect(fixedLabel("2027-03-25T12:05:00Z")).toBe("2027年3月25日登録・開幕前に固定");
  });
  it("returns an empty string for missing or broken values", () => {
    expect(formatRegisteredAt("not a date")).toBe("");
    expect(shortRegisteredAt("")).toBe("");
  });
});
