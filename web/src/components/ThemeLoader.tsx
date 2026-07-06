"use client";

import { useEffect } from "react";
import { getFirebaseAuth, onAuthStateChanged, type FirebaseUser } from "@/lib/firebase";
import {
  DEFAULT_COLOR_THEME_ID,
  DEFAULT_NUMBER_FONT_ID,
} from "@/lib/theme-presets";
import { applyLocalThemeFallback, applyTheme, readLocalThemeSettings } from "@/lib/theme-apply";

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
        if (!res.ok) throw new Error("settings unavailable");
        if (cancelled) return;
        const data = await res.json();
        const s = data as Record<string, string>;
        const local = !user ? readLocalThemeSettings() : { colorTheme: null, numberFont: null };
        const numFontId = local.numberFont ?? s.font_number ?? DEFAULT_NUMBER_FONT_ID;
        const themeId = local.colorTheme ?? s.color_theme ?? DEFAULT_COLOR_THEME_ID;

        applyTheme(themeId, numFontId);
      } catch {
        applyLocalThemeFallback();
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
