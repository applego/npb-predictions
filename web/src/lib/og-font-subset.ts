import { isValidElement, type ReactNode } from "react";

export type JPWeight = 400 | 700 | 900;

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: JPWeight;
  style: "normal";
}

/** Every distinct character rendered by a plain-element tree (no function components). */
export function collectText(node: ReactNode): string {
  const chars = new Set<string>();
  const walk = (n: ReactNode): void => {
    if (n === null || n === undefined || typeof n === "boolean") return;
    if (typeof n === "string" || typeof n === "number") {
      for (const ch of String(n)) chars.add(ch);
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (isValidElement<{ children?: ReactNode }>(n)) walk(n.props.children);
  };
  walk(node);
  return [...chars].join("");
}

type Fetch = typeof fetch;

/**
 * Noto Sans JP cut down to `text` (a few KB). The full Japanese face is ~2.7MB per weight; parsing three
 * of them per image pushed the Worker past its resource limit (error 1102). Without a User-Agent,
 * Google Fonts answers with TrueType, which satori accepts (it rejects woff2).
 */
export async function loadSubsetFont(weight: JPWeight, text: string, fetchImpl: Fetch = fetch): Promise<ArrayBuffer | null> {
  try {
    const css = await fetchImpl(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&text=${encodeURIComponent(text)}`,
    );
    if (!css.ok) return null;
    const url = (await css.text()).match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    const font = await fetchImpl(url);
    if (!font.ok) return null;
    const data = await font.arrayBuffer();
    return data.byteLength > 100 ? data : null;
  } catch {
    return null;
  }
}

const fullFonts = new Map<JPWeight, Promise<ArrayBuffer | null>>();

/** Full face, kept per isolate: the fallback when the subset service is unavailable. */
function loadFullFont(weight: JPWeight, fetchImpl: Fetch): Promise<ArrayBuffer | null> {
  let pending = fullFonts.get(weight);
  if (!pending) {
    pending = fetchImpl(`https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-${weight}-normal.ttf`)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .catch(() => null);
    fullFonts.set(weight, pending);
  }
  return pending;
}

export async function loadJPFonts(text: string, weights: JPWeight[], fetchImpl: Fetch = fetch): Promise<OgFont[]> {
  const fonts = await Promise.all(
    weights.map(async (weight) => {
      const data = (await loadSubsetFont(weight, text, fetchImpl)) ?? (await loadFullFont(weight, fetchImpl));
      return data ? { name: "Sans JP", data, weight, style: "normal" as const } : null;
    }),
  );
  return fonts.filter((font): font is OgFont => font !== null);
}
