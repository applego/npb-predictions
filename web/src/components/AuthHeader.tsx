"use client";

/* eslint-disable @next/next/no-img-element */
import { useAuth } from "@/contexts/AuthContext";

export function AuthHeader() {
  const { firebaseUser, appUser, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div
        className="h-8 w-20 animate-pulse rounded"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
    );
  }

  if (!firebaseUser) {
    return (
      <button
        onClick={signIn}
        className="whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium tracking-wider transition-all hover:opacity-90"
        style={{
          background: "rgba(251,191,36,0.12)",
          border: "1px solid rgba(251,191,36,0.25)",
          color: "#fbbf24",
          letterSpacing: "0.1em",
        }}
      >
        ログイン
      </button>
    );
  }

  const displayName = appUser?.name ?? firebaseUser.displayName ?? "User";
  const avatarUrl =
    appUser?.avatarUrl ?? firebaseUser.photoURL ?? undefined;

  return (
    <div className="flex items-center gap-2.5">
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
          style={{
            background: "rgba(251,191,36,0.15)",
            color: "#fbbf24",
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <span
        className="hidden text-xs sm:inline"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        {displayName}
      </span>
      <button
        onClick={signOut}
        className="whitespace-nowrap text-xs transition-colors hover:text-red-400"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        ログアウト
      </button>
    </div>
  );
}
