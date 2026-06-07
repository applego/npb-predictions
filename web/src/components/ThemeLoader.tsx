"use client";

import { useEffect } from "react";
import {
  DEFAULT_BODY_FONT_ID,
  DEFAULT_COLOR_THEME_ID,
  DEFAULT_NUMBER_FONT_ID,
  getNumberFont,
  getBodyFont,
  getColorTheme,
  buildGoogleFontsUrl,
} from "@/lib/theme-presets";

/**
 * Client component that loads theme settings from /api/settings
 * and dynamically injects CSS variables + Google Fonts.
 *
 * Placed in layout.tsx — runs once on page load.
 * Falls back to CSS defaults if API fails.
 */
export function ThemeLoader() {
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data as Record<string, string>;
        const numFontId = s.font_number ?? DEFAULT_NUMBER_FONT_ID;
        const bodyFontId = s.font_body ?? DEFAULT_BODY_FONT_ID;
        const themeId = s.color_theme ?? DEFAULT_COLOR_THEME_ID;

        const numFont = getNumberFont(numFontId);
        const bodyFont = getBodyFont(bodyFontId);
        const theme = getColorTheme(themeId);

        // 1. Inject Google Fonts <link>
        const fontsUrl = buildGoogleFontsUrl(numFontId, bodyFontId);
        const existing = document.getElementById("theme-google-fonts");
        if (existing) existing.remove();
        const link = document.createElement("link");
        link.id = "theme-google-fonts";
        link.rel = "stylesheet";
        link.href = fontsUrl;
        document.head.appendChild(link);

        // 2. Apply CSS variables to :root
        const root = document.documentElement;
        for (const [key, value] of Object.entries(theme.vars)) {
          root.style.setProperty(key, value);
        }
        root.style.setProperty("--font-display", numFont.family);
        root.style.setProperty("--font-body", bodyFont.family);

        // 3. Apply body font-family directly
        document.body.style.fontFamily = bodyFont.family;
      })
      .catch(() => {
        // Silently fall back to CSS defaults
      });
  }, []);

  return null; // This component renders nothing
}
