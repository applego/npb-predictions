import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../scrape-retry";

describe("withRetry", () => {
  it("returns ok on first success", async () => {
    const fn = vi.fn(async () => 42);
    const result = await withRetry(fn, { label: "test" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries and succeeds on 2nd attempt", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 2) throw new Error("boom");
      return "ok";
    });
    const result = await withRetry(fn, { label: "test", attempts: 3, backoffMs: 1 });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fails after all attempts exhausted", async () => {
    const err = new Error("permanent failure");
    const fn = vi.fn(async () => { throw err; });
    const result = await withRetry(fn, { label: "test", attempts: 3, backoffMs: 1 });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    if (!result.ok) expect(result.error).toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not try to log when db is not provided", async () => {
    const fn = vi.fn(async () => { throw new Error("x"); });
    // Should not throw even without db
    const result = await withRetry(fn, { label: "test", attempts: 2, backoffMs: 1 });
    expect(result.ok).toBe(false);
  });

  it("swallows db logging errors without failing the result", async () => {
    const fn = async () => { throw new Error("scrape error"); };
    const failingDb = {
      insert: () => ({
        values: () => {
          throw new Error("db down");
        },
      }),
    } as unknown as Parameters<typeof withRetry>[1]["db"];
    const result = await withRetry(fn, {
      label: "test",
      attempts: 1,
      backoffMs: 1,
      db: failingDb,
    });
    // The scrape error is what caller sees, not the db error
    expect(result.ok).toBe(false);
    if (!result.ok) expect(String(result.error)).toContain("scrape error");
  });
});
