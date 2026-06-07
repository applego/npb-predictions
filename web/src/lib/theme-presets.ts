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
  // ── Editorial Magazine Themes (E1-E12) ──
  {
    id: "editorial-cream-crimson",
    name: "Cream Crimson",
    description: "クリーム × 深紅 — ブックエディトリアル",
    vars: {
      "--bg-base": "#F5F2EA",
      "--bg-surface": "#FAF7F0",
      "--bg-elevated": "#EFEBE0",
      "--bg-inset": "#E8E3D5",
      "--border-primary": "#D8D2C0",
      "--border-strong": "#1C1917",
      "--text-primary": "#1C1917",
      "--text-secondary": "#44403C",
      "--text-muted": "#78716C",
      "--stitch": "#991B1B",
      "--stitch-light": "#B91C1C",
      "--field": "#3F6212",
      "--dirt": "#B45309",
    },
  },
  {
    id: "editorial-pure-paper",
    name: "Pure Paper",
    description: "白 × 赤 — clean newsprint",
    vars: {
      "--bg-base": "#FFFFFF",
      "--bg-surface": "#FFFFFF",
      "--bg-elevated": "#F8F8F8",
      "--bg-inset": "#F0F0F0",
      "--border-primary": "#E5E5E5",
      "--border-strong": "#0A0A0A",
      "--text-primary": "#0A0A0A",
      "--text-secondary": "#404040",
      "--text-muted": "#737373",
      "--stitch": "#DC2626",
      "--stitch-light": "#EF4444",
      "--field": "#15803D",
      "--dirt": "#CA8A04",
    },
  },
  {
    id: "editorial-sepia-archive",
    name: "Sepia Archive",
    description: "セピア × 茶 — retrospective",
    vars: {
      "--bg-base": "#F0E6D2",
      "--bg-surface": "#F5ECDB",
      "--bg-elevated": "#EAE0CB",
      "--bg-inset": "#E2D6BD",
      "--border-primary": "#C9BBA0",
      "--border-strong": "#3B2817",
      "--text-primary": "#3B2817",
      "--text-secondary": "#5C4530",
      "--text-muted": "#8B7355",
      "--stitch": "#7C2D12",
      "--stitch-light": "#9A3412",
      "--field": "#3F6212",
      "--dirt": "#A16207",
    },
  },
  {
    id: "editorial-forest-ivory",
    name: "Forest Ivory",
    description: "アイボリー × 深緑 — ボタニカル",
    vars: {
      "--bg-base": "#FAF6EA",
      "--bg-surface": "#FDFAF0",
      "--bg-elevated": "#F2EDDD",
      "--bg-inset": "#EBE4CF",
      "--border-primary": "#D6D0BB",
      "--border-strong": "#14532D",
      "--text-primary": "#14532D",
      "--text-secondary": "#365314",
      "--text-muted": "#65803A",
      "--stitch": "#B91C1C",
      "--stitch-light": "#DC2626",
      "--field": "#15803D",
      "--dirt": "#A16207",
    },
  },
  {
    id: "editorial-navy-ivory",
    name: "Navy Ivory",
    description: "紺 × 赤 — 日本野球伝統色",
    vars: {
      "--bg-base": "#FAF7F2",
      "--bg-surface": "#FEFBF6",
      "--bg-elevated": "#F2EDE5",
      "--bg-inset": "#EAE3D6",
      "--border-primary": "#D4CCB8",
      "--border-strong": "#0C1B33",
      "--text-primary": "#0C1B33",
      "--text-secondary": "#1E3A5F",
      "--text-muted": "#647184",
      "--stitch": "#B91C1C",
      "--stitch-light": "#DC2626",
      "--field": "#15803D",
      "--dirt": "#B45309",
    },
  },
  {
    id: "editorial-stone-orange",
    name: "Stone Orange",
    description: "ストーン × 朱 — earthy rustic",
    vars: {
      "--bg-base": "#EDE4D3",
      "--bg-surface": "#F2EADC",
      "--bg-elevated": "#E5DCC8",
      "--bg-inset": "#DDD3BC",
      "--border-primary": "#C4B89E",
      "--border-strong": "#1C1917",
      "--text-primary": "#1C1917",
      "--text-secondary": "#44403C",
      "--text-muted": "#78716C",
      "--stitch": "#C44536",
      "--stitch-light": "#DC5D4A",
      "--field": "#3F6212",
      "--dirt": "#A16207",
    },
  },
  {
    id: "editorial-charcoal-gold",
    name: "Charcoal Gold",
    description: "黒 × ゴールド — dark luxury (Number風)",
    vars: {
      "--bg-base": "#1C1917",
      "--bg-surface": "#252220",
      "--bg-elevated": "#2C2826",
      "--bg-inset": "#16140F",
      "--border-primary": "rgba(245,241,232,0.10)",
      "--border-strong": "rgba(201,169,97,0.50)",
      "--text-primary": "#F5F1E8",
      "--text-secondary": "#C7C0AC",
      "--text-muted": "#8A8678",
      "--stitch": "#C9A961",
      "--stitch-light": "#E0C57F",
      "--field": "#84CC16",
      "--dirt": "#FBBF24",
    },
  },
  {
    id: "editorial-midnight-red",
    name: "Midnight Red",
    description: "漆黒 × 赤 — cinema noir",
    vars: {
      "--bg-base": "#0C0C0C",
      "--bg-surface": "#161616",
      "--bg-elevated": "#1F1F1F",
      "--bg-inset": "#080808",
      "--border-primary": "rgba(245,245,245,0.08)",
      "--border-strong": "rgba(230,57,70,0.60)",
      "--text-primary": "#F5F5F5",
      "--text-secondary": "#B8B8B8",
      "--text-muted": "#707070",
      "--stitch": "#E63946",
      "--stitch-light": "#F1525E",
      "--field": "#34D399",
      "--dirt": "#FBBF24",
    },
  },
  {
    id: "editorial-rose-plum",
    name: "Rose Plum",
    description: "ローズ × プラム — 女性誌",
    vars: {
      "--bg-base": "#FDF4F0",
      "--bg-surface": "#FEF8F5",
      "--bg-elevated": "#F8EAE3",
      "--bg-inset": "#F1DDD3",
      "--border-primary": "#E5C9BD",
      "--border-strong": "#1C1917",
      "--text-primary": "#1C1917",
      "--text-secondary": "#5B1F3C",
      "--text-muted": "#9F7B89",
      "--stitch": "#5B1F3C",
      "--stitch-light": "#823056",
      "--field": "#65A30D",
      "--dirt": "#CA8A04",
    },
  },
  {
    id: "editorial-matcha-cream",
    name: "Matcha Cream",
    description: "クリーム × 抹茶 — 和モダン",
    vars: {
      "--bg-base": "#FAF6E8",
      "--bg-surface": "#FDFAF0",
      "--bg-elevated": "#F2EDDC",
      "--bg-inset": "#EBE4CC",
      "--border-primary": "#D6CFB6",
      "--border-strong": "#1C1917",
      "--text-primary": "#1C1917",
      "--text-secondary": "#3F4A2D",
      "--text-muted": "#7A8466",
      "--stitch": "#4A6B3A",
      "--stitch-light": "#6B8C58",
      "--field": "#4A6B3A",
      "--dirt": "#A16207",
    },
  },
  {
    id: "editorial-sky-vermillion",
    name: "Sky Vermillion",
    description: "ブルー × 赤 — 米国スコアボード",
    vars: {
      "--bg-base": "#F0F4F8",
      "--bg-surface": "#F8FAFC",
      "--bg-elevated": "#E5ECF3",
      "--bg-inset": "#D9E2EC",
      "--border-primary": "#C0CCD9",
      "--border-strong": "#1E3A8A",
      "--text-primary": "#1E3A8A",
      "--text-secondary": "#1E40AF",
      "--text-muted": "#64748B",
      "--stitch": "#DC2626",
      "--stitch-light": "#EF4444",
      "--field": "#15803D",
      "--dirt": "#CA8A04",
    },
  },
  {
    id: "editorial-paper-black",
    name: "Paper Black",
    description: "黒一色 — 最高コントラスト",
    vars: {
      "--bg-base": "#FFFFFF",
      "--bg-surface": "#FFFFFF",
      "--bg-elevated": "#F5F5F5",
      "--bg-inset": "#EEEEEE",
      "--border-primary": "#D4D4D4",
      "--border-strong": "#000000",
      "--text-primary": "#000000",
      "--text-secondary": "#262626",
      "--text-muted": "#737373",
      "--stitch": "#000000",
      "--stitch-light": "#404040",
      "--field": "#000000",
      "--dirt": "#525252",
    },
  },
];

// ── Helpers ──

export const DEFAULT_COLOR_THEME_ID = "editorial-navy-ivory";
export const DEFAULT_NUMBER_FONT_ID = "bebas";
export const DEFAULT_BODY_FONT_ID = "noto";

export function getNumberFont(id: string): NumberFont {
  return NUMBER_FONTS.find((f) => f.id === id) ?? NUMBER_FONTS[0];
}

export function getBodyFont(id: string): BodyFont {
  return BODY_FONTS.find((f) => f.id === id) ?? BODY_FONTS[0];
}

export function getColorTheme(id: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES.find((t) => t.id === DEFAULT_COLOR_THEME_ID) ?? COLOR_THEMES[0];
}

export function buildGoogleFontsUrl(numFontId: string, bodyFontId: string): string {
  const nf = getNumberFont(numFontId);
  const bf = getBodyFont(bodyFontId);
  return `https://fonts.googleapis.com/css2?${nf.googleQuery}&${bf.googleQuery}&display=swap`;
}
