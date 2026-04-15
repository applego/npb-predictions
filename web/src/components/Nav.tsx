"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const NAV_LINKS = [
  { href: "/", label: "HOME" },
  { href: "/standings", label: "STANDINGS" },
  { href: "/predictions", label: "PREDICTIONS" },
  { href: "/rankings/commentators", label: "RANKINGS" },
  { href: "/news", label: "NEWS" },
  { href: "/seo/past-seasons", label: "ARCHIVE" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const allLinks = isAdmin
    ? [...NAV_LINKS, { href: "/admin", label: "ADMIN" }]
    : NAV_LINKS;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden items-center gap-5 md:flex">
        {allLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="relative whitespace-nowrap text-xs font-medium tracking-widest transition-colors"
            style={{
              fontFamily: "var(--font-display)",
              color: isActive(href) ? "var(--stitch)" : "var(--text-muted)",
              letterSpacing: "0.15em",
            }}
          >
            {label}
            {isActive(href) && (
              <span
                className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                style={{ background: "var(--stitch)" }}
              />
            )}
          </Link>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-sm md:hidden"
        style={{
          background: open ? "rgba(229,57,53,0.08)" : "transparent",
          border: "1px solid var(--border-primary)",
        }}
        aria-label="Menu"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ color: open ? "var(--stitch)" : "var(--text-muted)" }}>
          {open ? (
            <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          ) : (
            <>
              <path d="M2 4H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile menu */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 md:hidden"
          style={{
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-primary)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div className="stitch-border" />
          <div className="mx-auto flex max-w-[72rem] flex-col gap-0.5 px-4 py-3">
            {allLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-sm px-3 py-2.5 text-sm font-medium tracking-widest"
                style={{
                  fontFamily: "var(--font-display)",
                  color: isActive(href) ? "var(--stitch)" : "var(--text-secondary)",
                  background: isActive(href) ? "rgba(229,57,53,0.06)" : "transparent",
                  letterSpacing: "0.12em",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
