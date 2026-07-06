"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function AuthHeader() {
  const { firebaseUser, appUser, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div
        className="h-8 w-20 animate-pulse rounded-sm"
        style={{ background: "var(--bg-elevated)" }}
      />
    );
  }

  if (!firebaseUser) {
    return (
      <button
        onClick={signIn}
        className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium tracking-wider transition-all"
        style={{
          background: "var(--field)",
          color: "#fff",
          letterSpacing: "0.08em",
        }}
      >
        ログイン
      </button>
    );
  }

  const displayName = appUser?.name ?? firebaseUser.displayName ?? "User";
  const avatarUrl = appUser?.avatarUrl ?? firebaseUser.photoURL ?? undefined;

  return (
    <div className="flex items-center gap-2.5">
      <Link href="/me" className="flex items-center gap-2 transition-opacity hover:opacity-80">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: "rgba(229,57,53,0.1)", color: "var(--stitch)" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden text-xs sm:inline" style={{ color: "var(--text-secondary)" }}>
          {displayName}
        </span>
      </Link>
      <button
        onClick={signOut}
        className="whitespace-nowrap text-xs transition-colors hover:text-red-600"
        style={{ color: "var(--text-muted)" }}
      >
        ログアウト
      </button>
    </div>
  );
}
