"use client";

import { useEffect } from "react";
import { getFirebaseAuth, onAuthStateChanged, type FirebaseUser } from "@/lib/firebase";
import {
  DEFAULT_COLOR_THEME_ID,
  DEFAULT_NUMBER_FONT_ID,
  getNumberFont,
  getColorTheme,
  buildGoogleFontsUrl,
} from "@/lib/theme-presets";

const LOCAL_COLOR_THEME_KEY = "npb_color_theme";
const LOCAL_NUMBER_FONT_KEY = "npb_number_font";

function applyTheme(themeId: string, numFontId: string) {
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

/**
 * Client component that loads theme settings from /api/settings
 * and dynamically injects CSS variables + Google Fonts.
 *
 * Placed in layout.tsx — runs once on page load.
 * Falls back to CSS defaults if API fails.
 */
export function ThemeLoader() {
  useEffect(() => {
    let cancelled = false;

    async function loadSettings(user: FirebaseUser | null) {
      const headers = new Headers();
      if (user) {
        try {
          headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
        } catch {
          // Fall back to site defaults if Firebase cannot provide a token.
        }
      }

      try {
        const res = await fetch("/api/settings", { headers });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const s = data as Record<string, string>;
        const localThemeId = !user ? window.localStorage.getItem(LOCAL_COLOR_THEME_KEY) : null;
        const localNumFontId = !user ? window.localStorage.getItem(LOCAL_NUMBER_FONT_KEY) : null;
        const numFontId = localNumFontId ?? s.font_number ?? DEFAULT_NUMBER_FONT_ID;
        const themeId = localThemeId ?? s.color_theme ?? DEFAULT_COLOR_THEME_ID;

        applyTheme(themeId, numFontId);
        window.localStorage.setItem(LOCAL_COLOR_THEME_KEY, themeId);
        window.localStorage.setItem(LOCAL_NUMBER_FONT_KEY, numFontId);
      } catch {
        const localThemeId = window.localStorage.getItem(LOCAL_COLOR_THEME_KEY);
        const localNumFontId = window.localStorage.getItem(LOCAL_NUMBER_FONT_KEY);
        if (localThemeId || localNumFontId) {
          applyTheme(
            localThemeId ?? DEFAULT_COLOR_THEME_ID,
            localNumFontId ?? DEFAULT_NUMBER_FONT_ID,
          );
        }
      }
    }

    const auth = getFirebaseAuth();
    void loadSettings(auth?.currentUser ?? null);
    const unsubscribe = auth
      ? onAuthStateChanged(auth, (user) => {
          void loadSettings(user);
        })
      : undefined;

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null; // This component renders nothing
}
