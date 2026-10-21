"use client";

export type GrowthEvent = "result_view" | "x_share_start" | "card_download";
/** Tab-scoped random token, not an account ID or persistent fingerprint. */
export function recordGrowth(event: GrowthEvent, year: number, league: string) {
  if (navigator.doNotTrack === "1") return;
  try {
    let session = sessionStorage.getItem("npb_growth_tab");
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem("npb_growth_tab", session); }
    const source = new URLSearchParams(window.location.search).get("utm_source") === "x" ? "x" : "other";
    const key = `npb_growth:${event}:${year}:${league}:${source}`;
    if (event === "result_view" && sessionStorage.getItem(key)) return;
    const payload = JSON.stringify({ id: crypto.randomUUID(), session, event, year, league, source });
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/growth/events", blob)) {
      void fetch("/api/growth/events", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
    if (event === "result_view") sessionStorage.setItem(key, "1");
  } catch { /* Telemetry never blocks viewing, sharing or downloading. */ }
}
