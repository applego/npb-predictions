import { describe, expect, it } from "vitest";
import { getPredictionWindowStatus } from "../prediction-window";

describe("getPredictionWindowStatus", () => {
  const now = new Date("2026-07-10T00:00:00.000Z");

  it("allows the active season when no lock date is set", () => {
    expect(getPredictionWindowStatus({ isActive: true, lockDate: null }, now)).toEqual({
      allowed: true,
    });
  });

  it("blocks inactive past seasons even when lock date is missing", () => {
    expect(getPredictionWindowStatus({ isActive: false, lockDate: null }, now)).toEqual({
      allowed: false,
      reason: "inactive",
    });
  });

  it("blocks an active season after its lock date", () => {
    expect(
      getPredictionWindowStatus(
        { isActive: true, lockDate: "2026-03-27T09:00:00.000Z" },
        now,
      ),
    ).toEqual({
      allowed: false,
      reason: "locked",
    });
  });
});
