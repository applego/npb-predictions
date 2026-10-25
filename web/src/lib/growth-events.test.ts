import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { recordGrowth } from "./growth-events";

let storage: Map<string, string>;
let sendBeacon: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
  storage = new Map();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  sendBeacon = vi.fn(() => true);
  vi.stubGlobal("navigator", { doNotTrack: null, sendBeacon });
  vi.stubGlobal("window", { location: { search: "?utm_source=x" } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
async function body(index: number) {
  return JSON.parse(await (sendBeacon.mock.calls[index][1] as Blob).text());
}
it("records a returning open tab each UTC day and suppresses same-day duplicates", async () => {
  recordGrowth("result_view", 2026, "central");
  recordGrowth("result_view", 2026, "central");
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date("2026-10-26T00:00:00Z"));
  recordGrowth("result_view", 2026, "central");
  expect(sendBeacon).toHaveBeenCalledTimes(2);
  expect((await body(1)).session).toBe((await body(0)).session);
});
it("retains X attribution through internal navigation only in the same tab", async () => {
  recordGrowth("result_view", 2026, "central");
  window.location.search = "?year=2026&league=pacific";
  recordGrowth("result_view", 2026, "pacific");
  recordGrowth("x_share_start", 2026, "pacific");
  recordGrowth("x_share_start", 2026, "pacific");
  recordGrowth("card_download", 2026, "pacific");
  expect(sendBeacon).toHaveBeenCalledTimes(5);
  for (let i = 0; i < 5; i++) expect((await body(i)).source).toBe("x");
  storage.clear(); recordGrowth("result_view", 2026, "pacific");
  expect((await body(5)).source).toBe("other");
  expect((await body(5)).session).not.toBe((await body(0)).session);
});
it("respects DNT before allocating a token and tolerates storage failures", () => {
  vi.stubGlobal("navigator", { doNotTrack: "1", sendBeacon });
  recordGrowth("result_view", 2026, "central");
  expect(sendBeacon).not.toHaveBeenCalled(); expect(storage.size).toBe(0);
  vi.stubGlobal("navigator", { doNotTrack: null, sendBeacon });
  vi.stubGlobal("sessionStorage", { getItem: () => { throw Error("blocked"); } });
  expect(() => recordGrowth("card_download", 2026, "all")).not.toThrow();
  expect(sendBeacon).not.toHaveBeenCalled();
});
