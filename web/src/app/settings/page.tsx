"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DEFAULT_COLOR_THEME_ID,
  NUMBER_FONTS, BODY_FONTS, COLOR_THEMES,
  getNumberFont, getBodyFont, getColorTheme,
  type NumberFont, type BodyFont, type ColorTheme,
} from "@/lib/theme-presets";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ── Load Google Fonts dynamically ──

function useGoogleFont(query: string) {
  useEffect(() => {
    const id = `gf-${query.replace(/[^a-z0-9]/gi, "")}`.slice(0, 60);
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    document.head.appendChild(link);
  }, [query]);
}

// ── Shared preview component ──

function ScorePreview({
  numFamily,
  bodyFamily,
  themeVars,
}: {
  numFamily: string;
  bodyFamily: string;
  themeVars: Record<string, string>;
}) {
  const bg = themeVars["--bg-surface"] ?? "#fff";
  const bgEl = themeVars["--bg-elevated"] ?? "#f5f5f5";
  const border = themeVars["--border-primary"] ?? "#e5e5e5";
  const text1 = themeVars["--text-primary"] ?? "#1a1a1a";
  const text2 = themeVars["--text-secondary"] ?? "#525252";
  const textM = themeVars["--text-muted"] ?? "#a3a3a3";
  const stitch = themeVars["--stitch"] ?? "#E53935";
  const field = themeVars["--field"] ?? "#2E7D32";
  const dirt = themeVars["--dirt"] ?? "#D4A017";

  return (
    <div style={{ background: bgEl, borderRadius: "6px", padding: "0.75rem", border: `1px solid ${border}` }}>
      {/* Big scores */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "0.5rem" }}>
        <span style={{ fontFamily: numFamily, fontSize: "2rem", fontWeight: 700, color: field, lineHeight: 1 }}>+48</span>
        <span style={{ fontFamily: numFamily, fontSize: "2rem", fontWeight: 700, color: stitch, lineHeight: 1 }}>-12</span>
        <span style={{ fontFamily: numFamily, fontSize: "1.1rem", color: dirt, lineHeight: 1 }}>2025</span>
      </div>
      {/* Mini table */}
      <div style={{ borderTop: `1px solid ${border}`, paddingTop: "0.4rem" }}>
        {[
          { rank: "1", name: "中畑清陽", score: "+48", color: field, rankColor: dirt },
          { rank: "2", name: "高橋由伸", score: "-3", color: stitch, rankColor: textM },
          { rank: "3", name: "安仁屋宗八", score: "+36", color: field, rankColor: textM },
        ].map((r) => (
          <div key={r.rank} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0" }}>
            <span style={{ fontFamily: numFamily, fontSize: "0.8rem", color: r.rankColor, width: "1.2rem", textAlign: "center" }}>{r.rank}</span>
            <span style={{ fontFamily: bodyFamily, fontSize: "0.75rem", color: text1, flex: 1 }}>{r.name}</span>
            <span style={{ fontFamily: numFamily, fontSize: "0.8rem", fontWeight: 700, color: r.color }}>{r.score}</span>
          </div>
        ))}
      </div>
      {/* Body text */}
      <p style={{ fontFamily: bodyFamily, fontSize: "0.65rem", color: textM, marginTop: "0.4rem" }}>
        213人の解説者の順位予想を比較 — セ・パ両リーグ
      </p>
    </div>
  );
}

// ── Settings Page ──

export default function SettingsPage() {
  const [numFont, setNumFont] = useState("bebas");
  const [bodyFont, setBodyFont] = useState("noto");
  const [colorTheme, setColorTheme] = useState(DEFAULT_COLOR_THEME_ID);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load all Google Fonts for preview
  for (const nf of NUMBER_FONTS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useGoogleFont(nf.googleQuery);
  }
  for (const bf of BODY_FONTS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useGoogleFont(bf.googleQuery);
  }

  // Load current settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = d as Record<string, string>;
        if (s.font_number) setNumFont(s.font_number);
        if (s.font_body) setBodyFont(s.font_body);
        if (s.color_theme) setColorTheme(s.color_theme);
      })
      .catch(() => {});
  }, []);

  const save = useCallback(async (key: string, value: string) => {
    setSaving(true);
    setMessage("");
    const res = await fetchWithAuth("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving(false);
    setMessage(res.ok ? "保存しました — リロードで反映" : "保存できませんでした — 管理者ログインが必要です");
  }, []);

  const currentThemeVars = getColorTheme(colorTheme).vars;

  return (
    <div className="space-y-8">
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 4vw, 2.25rem)", letterSpacing: "0.04em", color: "var(--text-primary)" }}>
          THEME <span style={{ color: "var(--stitch)" }}>SETTINGS</span>
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          数字フォント・日本語フォント・カラーテーマを個別に選択
        </p>
        {message && (
          <p className="mt-2 text-sm" style={{ color: "var(--field)" }}>{message}</p>
        )}
      </div>

      {/* ══════════ 1. NUMBER FONT ══════════ */}
      <section>
        <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--text-primary)", letterSpacing: "0.08em" }}>
          数字フォント <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>— スコア・年号・順位</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NUMBER_FONTS.map((nf) => {
            const active = numFont === nf.id;
            return (
              <button
                key={nf.id}
                type="button"
                onClick={() => { setNumFont(nf.id); void save("font_number", nf.id); }}
                className="w-full rounded-lg p-3 text-left transition-all"
                style={{
                  background: active ? "rgba(229,57,53,0.04)" : "var(--bg-surface)",
                  border: active ? "2px solid var(--stitch)" : "2px solid var(--border-primary)",
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{nf.name}</span>
                  {active && <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "var(--stitch)", color: "#fff" }}>ON</span>}
                </div>
                {/* Number preview */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                  <span style={{ fontFamily: nf.family, fontSize: "1.75rem", fontWeight: 700, color: "var(--field)", lineHeight: 1 }}>+48</span>
                  <span style={{ fontFamily: nf.family, fontSize: "1.75rem", fontWeight: 700, color: "var(--stitch)", lineHeight: 1 }}>-12</span>
                  <span style={{ fontFamily: nf.family, fontSize: "1rem", color: "var(--dirt)", lineHeight: 1 }}>2025</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ══════════ 2. BODY FONT ══════════ */}
      <section>
        <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--text-primary)", letterSpacing: "0.08em" }}>
          日本語フォント <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>— 本文・解説者名・UI</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BODY_FONTS.map((bf) => {
            const active = bodyFont === bf.id;
            return (
              <button
                key={bf.id}
                type="button"
                onClick={() => { setBodyFont(bf.id); void save("font_body", bf.id); }}
                className="w-full rounded-lg p-3 text-left transition-all"
                style={{
                  background: active ? "rgba(229,57,53,0.04)" : "var(--bg-surface)",
                  border: active ? "2px solid var(--stitch)" : "2px solid var(--border-primary)",
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{bf.name}</span>
                  {active && <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "var(--stitch)", color: "#fff" }}>ON</span>}
                </div>
                <div style={{ fontFamily: bf.family }}>
                  <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                    2025年 セ・リーグ 順位予想ランキング
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    213人の解説者・評論家の開幕前予想を比較
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ══════════ 3. COLOR THEME ══════════ */}
      <section>
        <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--text-primary)", letterSpacing: "0.08em" }}>
          カラーテーマ <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>— 全体の配色</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COLOR_THEMES.map((theme) => {
            const active = colorTheme === theme.id;
            const v = theme.vars;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => { setColorTheme(theme.id); void save("color_theme", theme.id); }}
                className="w-full rounded-lg p-4 text-left transition-all"
                style={{
                  background: v["--bg-base"],
                  border: active ? `2px solid ${v["--stitch"]}` : `2px solid ${v["--border-primary"]}`,
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: v["--text-primary"] }}>{theme.name}</span>
                    <span style={{ fontSize: "0.7rem", color: v["--text-muted"], marginLeft: "0.5rem" }}>{theme.description}</span>
                  </div>
                  {active && (
                    <span className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold" style={{ background: v["--stitch"], color: "#fff" }}>ON</span>
                  )}
                </div>
                {/* Color swatches */}
                <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
                  {[v["--bg-base"], v["--bg-surface"], v["--stitch"], v["--field"], v["--dirt"], v["--text-primary"]].map((c, i) => (
                    <div key={i} style={{ width: "1.5rem", height: "1.5rem", borderRadius: "3px", background: c, border: `1px solid ${v["--border-primary"]}` }} />
                  ))}
                </div>
                {/* Full preview with current number + body font */}
                <ScorePreview
                  numFamily={getNumberFont(numFont).family}
                  bodyFamily={getBodyFont(bodyFont).family}
                  themeVars={v}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Apply button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-sm px-5 py-2.5 text-sm font-bold transition-all"
          style={{ background: "var(--stitch)", color: "#fff" }}
        >
          テーマを適用（リロード）
        </button>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          管理者のみ保存できます
        </span>
      </div>
    </div>
  );
}
