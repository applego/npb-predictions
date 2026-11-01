"use client";

import type { AffiliateResource } from "@/lib/affiliate-resources";

export function AffiliateLink({ resource }: { resource: AffiliateResource }) {
  function recordClick() {
    const payload = JSON.stringify({
      resourceId: resource.id,
      href: resource.href,
      path: window.location.pathname,
    });

    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/affiliate/click", blob)) return;

    void fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }

  return (
    <a
      href={resource.href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={recordClick}
      className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold transition-all"
      style={{
        background: resource.monetized ? "var(--field)" : "var(--bg-elevated)",
        border: resource.monetized ? "1px solid var(--field)" : "1px solid var(--border-primary)",
        color: resource.monetized ? "#fff" : "var(--text-secondary)",
      }}
    >
      {resource.label}
      <span className="ml-2" aria-hidden="true">
        &#8599;
      </span>
    </a>
  );
}
