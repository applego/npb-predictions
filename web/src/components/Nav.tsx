"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const NAV_LINKS = [
  { href: "/", label: "トップ" },
  { href: "/rankings", label: "ランキング" },
  { href: "/games", label: "試合" },
  { href: "/groups", label: "グループ" },
  { href: "/news", label: "ニュース" },
  { href: "/resources", label: "道具箱" },
  { href: "/settings", label: "設定" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const allLinks = isAdmin
    ? [...NAV_LINKS, { href: "/admin", label: "管理" }]
    : NAV_LINKS;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const focusable = menu?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden items-center gap-2 lg:flex">
        {allLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="relative inline-flex min-h-9 items-center whitespace-nowrap px-2 text-xs font-medium tracking-widest transition-colors"
            style={{
              fontFamily: "var(--font-display)",
              color: isActive(href) ? "var(--field)" : "var(--text-muted)",
              letterSpacing: "0.15em",
            }}
          >
            {label}
            {isActive(href) && (
              <span
                className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                style={{ background: "var(--field)" }}
              />
            )}
          </Link>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-sm lg:hidden"
        style={{
          background: open ? "rgba(229,57,53,0.08)" : "transparent",
          border: "1px solid var(--border-primary)",
        }}
        aria-label="メニュー"
        aria-expanded={open}
        aria-controls="mobile-navigation"
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
          ref={menuRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="モバイルナビゲーション"
          className="absolute left-0 right-0 top-full z-50 lg:hidden"
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
                className="flex min-h-[44px] items-center rounded-sm px-3 text-sm font-medium tracking-widest"
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
