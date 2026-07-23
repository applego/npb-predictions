import { describe, expect, it } from "vitest";
import { shiftIsoDate } from "../date-navigation";

describe("shiftIsoDate", () => {
  it("moves forward one calendar day independently of the runtime timezone", () => {
    expect(shiftIsoDate("2026-05-20", 1)).toBe("2026-05-21");
  });

  it("moves backward one calendar day independently of the runtime timezone", () => {
    expect(shiftIsoDate("2026-05-20", -1)).toBe("2026-05-19");
  });

  it("crosses month, year, and leap-day boundaries", () => {
    expect(shiftIsoDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftIsoDate("2026-05-31", 1)).toBe("2026-06-01");
    expect(shiftIsoDate("2024-02-28", 1)).toBe("2024-02-29");
  });
});
