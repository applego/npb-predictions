"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface MyRankResponse {
  userId: number;
  userName: string;
  rank: number;
  totalUsers: number;
  score: number;
  year: number;
}

interface Notification {
  type: "up" | "down" | "new" | "same";
  rank: number;
  totalUsers: number;
  score: number;
  delta: number; // abs value
  year: number;
}

function storageKey(uid: string, year: number) {
  return `npb_rank_${uid}_${year}`;
}

export function RankChangeNotifier({ year }: { year?: number }) {
  const { firebaseUser } = useAuth();
  const [notif, setNotif] = useState<Notification | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    if (!firebaseUser) return;
    const targetYear = year ?? new Date().getFullYear();

    try {
      const res = await fetch(
        `/api/my-rank?uid=${encodeURIComponent(firebaseUser.uid)}&year=${targetYear}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as MyRankResponse;
      if (!data.rank || data.totalUsers === 0) return;

      const key = storageKey(firebaseUser.uid, targetYear);
      const stored = localStorage.getItem(key);
      const prevRank = stored ? parseInt(stored, 10) : null;

      // Save current rank
      localStorage.setItem(key, String(data.rank));

      if (prevRank === null) {
        // First visit — no notification
        return;
      }

      const delta = prevRank - data.rank; // positive = 上昇

      if (delta === 0) return; // no change

      setNotif({
        type: delta > 0 ? "up" : "down",
        rank: data.rank,
        totalUsers: data.totalUsers,
        score: data.score,
        delta: Math.abs(delta),
        year: targetYear,
      });
    } catch {
      // ignore errors
    }
  }, [firebaseUser, year]);

  useEffect(() => {
    if (!firebaseUser) return;
    void check();
  }, [check, firebaseUser]);

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!notif) return;
    const t = setTimeout(() => setDismissed(true), 8000);
    return () => clearTimeout(t);
  }, [notif]);

  if (!notif || dismissed) return null;

  const isUp = notif.type === "up";
  const accentColor = isUp ? "#4ade80" : "#f87171";
  const bgColor = isUp ? "rgba(74,222,128,0.10)" : "rgba(248,113,113,0.10)";
  const borderColor = isUp ? "rgba(74,222,128,0.30)" : "rgba(248,113,113,0.30)";
  const icon = isUp ? "↑" : "↓";

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-w-xs items-start gap-3 rounded-xl p-4 shadow-xl"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${borderColor}`,
        backdropFilter: "blur(12px)",
      }}
      role="status"
    >
      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold"
        style={{ background: bgColor, color: accentColor }}
      >
        {icon}{notif.delta}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {isUp
            ? `${notif.delta}位 上昇しました 🎉`
            : `${notif.delta}位 ダウン`}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          現在{" "}
          <span style={{ color: accentColor, fontWeight: 700 }}>
            {notif.rank}位
          </span>{" "}
          / {notif.totalUsers}人中 — {notif.year}シーズン
        </p>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-xs transition-opacity hover:opacity-60"
        style={{ color: "var(--text-muted)" }}
        aria-label="閉じる"
      >
        ✕
      </button>
    </div>
  );
}
