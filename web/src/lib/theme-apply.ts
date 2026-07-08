import {
  DEFAULT_COLOR_THEME_ID,
  DEFAULT_NUMBER_FONT_ID,
  buildGoogleFontsUrl,
  getColorTheme,
  getNumberFont,
} from "@/lib/theme-presets";

export const LOCAL_COLOR_THEME_KEY = "npb_color_theme";
export const LOCAL_NUMBER_FONT_KEY = "npb_number_font";

export function readLocalThemeSettings(): {
  colorTheme: string | null;
  numberFont: string | null;
} {
  return {
    colorTheme: window.localStorage.getItem(LOCAL_COLOR_THEME_KEY),
    numberFont: window.localStorage.getItem(LOCAL_NUMBER_FONT_KEY),
  };
}

export function saveLocalThemeSetting(key: "color_theme" | "font_number", value: string) {
  window.localStorage.setItem(
    key === "color_theme" ? LOCAL_COLOR_THEME_KEY : LOCAL_NUMBER_FONT_KEY,
    value,
  );
}

export function applyTheme(themeId: string, numFontId: string) {
  const numFont = getNumberFont(numFontId);
  const theme = getColorTheme(themeId);
  const fontsUrl = buildGoogleFontsUrl(numFontId);
  const existing = document.getElementById("theme-google-fonts");
  if (existing) existing.remove();
  const link = document.createElement("link");
  link.id = "theme-google-fonts";
  link.rel = "stylesheet";
  link.href = fontsUrl;
  document.head.appendChild(link);

  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
  root.style.setProperty("--font-display", numFont.family);
  root.style.setProperty("--font-body", "var(--font-body-default)");
  document.body.style.fontFamily = "var(--font-body-default)";
}

export function applyLocalThemeFallback() {
  const local = readLocalThemeSettings();
  if (!local.colorTheme && !local.numberFont) return false;
  applyTheme(
    local.colorTheme ?? DEFAULT_COLOR_THEME_ID,
    local.numberFont ?? DEFAULT_NUMBER_FONT_ID,
  );
  return true;
}
