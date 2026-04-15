// Font preset definitions — shared between API, layout, and settings UI

export interface FontPreset {
  id: string;
  label: string;
  description: string;
  display: string;       // Google Font name for headings/numbers
  displayWeight: string; // Weight for display font
  body: string;          // Google Font name for body text
  bodyWeight: string;
  // Google Fonts URL query params (family part only)
  googleFontsQuery: string;
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "A",
    label: "Classic",
    description: "Bebas Neue + Noto Sans JP — 定番",
    display: "'Bebas Neue', Impact, sans-serif",
    displayWeight: "400",
    body: "'Noto Sans JP', sans-serif",
    bodyWeight: "400;700",
    googleFontsQuery: "family=Bebas+Neue&family=Noto+Sans+JP:wght@400;700",
  },
  {
    id: "B",
    label: "Sport",
    description: "Oswald + Zen Kaku Gothic New — スポーツ新聞風",
    display: "'Oswald', Impact, sans-serif",
    displayWeight: "400;700",
    body: "'Zen Kaku Gothic New', sans-serif",
    bodyWeight: "400;700",
    googleFontsQuery: "family=Oswald:wght@400;700&family=Zen+Kaku+Gothic+New:wght@400;700",
  },
  {
    id: "C",
    label: "Modern",
    description: "Barlow Condensed + M PLUS 1p — モダンテック",
    display: "'Barlow Condensed', sans-serif",
    displayWeight: "400;600;700",
    body: "'M PLUS 1p', sans-serif",
    bodyWeight: "400;700",
    googleFontsQuery: "family=Barlow+Condensed:wght@400;600;700&family=M+PLUS+1p:wght@400;700",
  },
  {
    id: "D",
    label: "Data",
    description: "JetBrains Mono + Zen Kaku Gothic New — データダッシュボード",
    display: "'JetBrains Mono', monospace",
    displayWeight: "400;700",
    body: "'Zen Kaku Gothic New', sans-serif",
    bodyWeight: "400;700",
    googleFontsQuery: "family=JetBrains+Mono:wght@400;700&family=Zen+Kaku+Gothic+New:wght@400;700",
  },
  {
    id: "E",
    label: "Impact",
    description: "Anton + Murecho — インパクト重視",
    display: "'Anton', Impact, sans-serif",
    displayWeight: "400",
    body: "'Murecho', sans-serif",
    bodyWeight: "400;700",
    googleFontsQuery: "family=Anton&family=Murecho:wght@400;700",
  },
  {
    id: "F",
    label: "Scoreboard",
    description: "Saira Condensed + BIZ UDPGothic — 電光掲示板風",
    display: "'Saira Condensed', sans-serif",
    displayWeight: "400;700;900",
    body: "'BIZ UDPGothic', sans-serif",
    bodyWeight: "400;700",
    googleFontsQuery: "family=Saira+Condensed:wght@400;700;900&family=BIZ+UDPGothic:wght@400;700",
  },
];

export function getPreset(id: string): FontPreset {
  return FONT_PRESETS.find((p) => p.id === id) ?? FONT_PRESETS[0];
}
