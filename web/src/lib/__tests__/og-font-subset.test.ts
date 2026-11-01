import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { collectText, loadJPFonts } from "../og-font-subset";

const CSS_URL = "https://fonts.googleapis.com/css2";
const SUBSET_URL = "https://fonts.gstatic.com/l/font?kit=subset";
const FULL_URL = "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-";

/** Fake network: answers only the three known hosts; anything else fails the test. */
function fakeFetch(opts: { cssOk: boolean }) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith(CSS_URL)) {
      return opts.cssOk
        ? new Response(`@font-face { src: url(${SUBSET_URL}) format('truetype'); }`)
        : new Response("", { status: 503 });
    }
    if (url === SUBSET_URL) return new Response(new Uint8Array(4_000));
    if (url.startsWith(FULL_URL)) return new Response(new Uint8Array(2_700_000));
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  return { impl, calls };
}

describe("collectText", () => {
  it("gathers each rendered character once, including numbers and nested arrays", () => {
    const tree = createElement("div", null, "阪神", [createElement("span", { key: 1 }, "首位", 3)], null, false, "阪");
    expect([...collectText(tree)].sort().join("")).toBe([..."阪神首位3"].sort().join(""));
  });
});

describe("loadJPFonts", () => {
  it("uses a font cut down to the rendered text instead of the 2.7MB face", async () => {
    const { impl, calls } = fakeFetch({ cssOk: true });
    const fonts = await loadJPFonts("阪神首位", [900, 700], impl);
    expect(fonts.map((f) => [f.weight, f.data.byteLength])).toEqual([[900, 4_000], [700, 4_000]]);
    expect(calls.filter((u) => u.startsWith(CSS_URL)).every((u) => u.includes(encodeURIComponent("阪神首位")))).toBe(true);
    expect(calls.some((u) => u.startsWith(FULL_URL))).toBe(false);
  });

  it("falls back to the full face when the subset service fails, so the image still renders", async () => {
    const { impl } = fakeFetch({ cssOk: false });
    const fonts = await loadJPFonts("阪神", [400], impl);
    expect(fonts.map((f) => [f.weight, f.data.byteLength])).toEqual([[400, 2_700_000]]);
  });
});
