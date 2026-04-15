// Theme system: independent selection of number font, body font, and color theme

// ── Number/Display Fonts ──

export interface NumberFont {
  id: string;
  name: string;
  family: string; // CSS font-family value
  googleQuery: string; // Google Fonts query param
  sample: string; // How +48 looks (for mental model)
}

export const NUMBER_FONTS: NumberFont[] = [
  { id: "bebas", name: "Bebas Neue", family: "'Bebas Neue', Impact, sans-serif", googleQuery: "family=Bebas+Neue", sample: "condensed" },
  { id: "oswald", name: "Oswald", family: "'Oswald', sans-serif", googleQuery: "family=Oswald:wght@400;700", sample: "sports" },
  { id: "barlow", name: "Barlow Condensed", family: "'Barlow Condensed', sans-serif", googleQuery: "family=Barlow+Condensed:wght@400;600;700", sample: "modern" },
  { id: "teko", name: "Teko", family: "'Teko', sans-serif", googleQuery: "family=Teko:wght@400;600;700", sample: "tall" },
  { id: "jetbrains", name: "JetBrains Mono", family: "'JetBrains Mono', monospace", googleQuery: "family=JetBrains+Mono:wght@400;700", sample: "monospace" },
  { id: "saira", name: "Saira Condensed", family: "'Saira Condensed', sans-serif", googleQuery: "family=Saira+Condensed:wght@400;700;900", sample: "scoreboard" },
  { id: "anton", name: "Anton", family: "'Anton', sans-serif", googleQuery: "family=Anton", sample: "impact" },
];

// ── Body/Japanese Fonts ──

export interface BodyFont {
  id: string;
  name: string;
  family: string;
  googleQuery: string;
}

export const BODY_FONTS: BodyFont[] = [
  // ── ゴシック体 ──
  { id: "noto", name: "Noto Sans JP", family: "'Noto Sans JP', sans-serif", googleQuery: "family=Noto+Sans+JP:wght@400;700" },
  { id: "zen", name: "Zen Kaku Gothic New", family: "'Zen Kaku Gothic New', sans-serif", googleQuery: "family=Zen+Kaku+Gothic+New:wght@400;700" },
  { id: "mplus", name: "M PLUS 1p", family: "'M PLUS 1p', sans-serif", googleQuery: "family=M+PLUS+1p:wght@400;700" },
  { id: "biz", name: "BIZ UDPGothic", family: "'BIZ UDPGothic', sans-serif", googleQuery: "family=BIZ+UDPGothic:wght@400;700" },
  { id: "murecho", name: "Murecho", family: "'Murecho', sans-serif", googleQuery: "family=Murecho:wght@400;700" },
  { id: "maru", name: "Zen Maru Gothic", family: "'Zen Maru Gothic', sans-serif", googleQuery: "family=Zen+Maru+Gothic:wght@400;700" },
  // ── 明朝体（新聞風） ──
  { id: "noto-serif", name: "Noto Serif JP", family: "'Noto Serif JP', serif", googleQuery: "family=Noto+Serif+JP:wght@400;700;900" },
  { id: "shippori", name: "Shippori Mincho B1", family: "'Shippori Mincho B1', serif", googleQuery: "family=Shippori+Mincho+B1:wght@400;700;800" },
  { id: "zen-old", name: "Zen Old Mincho", family: "'Zen Old Mincho', serif", googleQuery: "family=Zen+Old+Mincho:wght@400;700;900" },
  { id: "biz-mincho", name: "BIZ UDPMincho", family: "'BIZ UDPMincho', serif", googleQuery: "family=BIZ+UDPMincho" },
  { id: "zen-antique", name: "Zen Antique", family: "'Zen Antique', serif", googleQuery: "family=Zen+Antique" },
];

// ── Color Themes ──

export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  vars: Record<string, string>; // CSS variable overrides
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "baseball",
    name: "Baseball",
    description: "白革 + 赤い縫い目",
    vars: {
      "--bg-base": "#FAFAFA",
      "--bg-surface": "#FFFFFF",
      "--bg-elevated": "#F5F5F5",
      "--bg-inset": "#F0F0F0",
      "--border-primary": "#E5E5E5",
      "--border-strong": "#D4D4D4",
      "--text-primary": "#1A1A1A",
      "--text-secondary": "#525252",
      "--text-muted": "#A3A3A3",
      "--stitch": "#E53935",
      "--stitch-light": "#EF5350",
      "--field": "#2E7D32",
      "--dirt": "#D4A017",
    },
  },
  {
    id: "stadium",
    name: "Stadium",
    description: "ナイトゲームの電光掲示板",
    vars: {
      "--bg-base": "#040912",
      "--bg-surface": "#0A1525",
      "--bg-elevated": "#0F1D35",
      "--bg-inset": "#060D1A",
      "--border-primary": "rgba(255,255,255,0.06)",
      "--border-strong": "rgba(255,255,255,0.12)",
      "--text-primary": "#F5F5F7",
      "--text-secondary": "#A1A1AA",
      "--text-muted": "#52525B",
      "--stitch": "#FBBF24",
      "--stitch-light": "#FCD34D",
      "--field": "#34D399",
      "--dirt": "#FBBF24",
    },
  },
  {
    id: "newspaper",
    name: "Newspaper",
    description: "スポーツ新聞の紙面",
    vars: {
      "--bg-base": "#F5F0E8",
      "--bg-surface": "#FFFDF5",
      "--bg-elevated": "#F0EBE0",
      "--bg-inset": "#EAE5DA",
      "--border-primary": "#D4CFC4",
      "--border-strong": "#B8B3A8",
      "--text-primary": "#1A1A1A",
      "--text-secondary": "#4A4A4A",
      "--text-muted": "#8A8A7A",
      "--stitch": "#CC0000",
      "--stitch-light": "#E60000",
      "--field": "#006600",
      "--dirt": "#B8860B",
    },
  },
  {
    id: "night",
    name: "Night Game",
    description: "深夜の球場 + ネオンブルー",
    vars: {
      "--bg-base": "#0B0F1A",
      "--bg-surface": "#111827",
      "--bg-elevated": "#1E293B",
      "--bg-inset": "#0F172A",
      "--border-primary": "rgba(99,102,241,0.12)",
      "--border-strong": "rgba(99,102,241,0.25)",
      "--text-primary": "#E2E8F0",
      "--text-secondary": "#94A3B8",
      "--text-muted": "#475569",
      "--stitch": "#6366F1",
      "--stitch-light": "#818CF8",
      "--field": "#34D399",
      "--dirt": "#F59E0B",
    },
  },
  {
    id: "sports-red",
    name: "激アツ（赤）",
    description: "白地に赤黒 — スポーツ紙の一面風",
    vars: {
      "--bg-base": "#F5F5F5",
      "--bg-surface": "#FFFFFF",
      "--bg-elevated": "#F0F0F0",
      "--bg-inset": "#E8E8E8",
      "--border-primary": "#CCCCCC",
      "--border-strong": "#1A1A1A",
      "--text-primary": "#0A0A0A",
      "--text-secondary": "#333333",
      "--text-muted": "#777777",
      "--stitch": "#CC0000",
      "--stitch-light": "#FF0000",
      "--field": "#006600",
      "--dirt": "#CC6600",
    },
  },
  {
    id: "sports-blue",
    name: "激アツ（青）",
    description: "白地に青黒 — 中日スポーツ風",
    vars: {
      "--bg-base": "#F5F5F5",
      "--bg-surface": "#FFFFFF",
      "--bg-elevated": "#EEF2F7",
      "--bg-inset": "#E0E8F0",
      "--border-primary": "#CCCCCC",
      "--border-strong": "#1A1A1A",
      "--text-primary": "#0A0A0A",
      "--text-secondary": "#2A2A3A",
      "--text-muted": "#6A6A7A",
      "--stitch": "#0033AA",
      "--stitch-light": "#0055DD",
      "--field": "#006600",
      "--dirt": "#CC6600",
    },
  },
];

// ── Helpers ──

export function getNumberFont(id: string): NumberFont {
  return NUMBER_FONTS.find((f) => f.id === id) ?? NUMBER_FONTS[0];
}

export function getBodyFont(id: string): BodyFont {
  return BODY_FONTS.find((f) => f.id === id) ?? BODY_FONTS[0];
}

export function getColorTheme(id: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

export function buildGoogleFontsUrl(numFontId: string, bodyFontId: string): string {
  const nf = getNumberFont(numFontId);
  const bf = getBodyFont(bodyFontId);
  return `https://fonts.googleapis.com/css2?${nf.googleQuery}&${bf.googleQuery}&display=swap`;
}
