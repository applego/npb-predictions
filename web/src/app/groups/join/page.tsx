"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

export default function JoinGroupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { firebaseUser, appUser, loading, signIn } = useAuth();

  const codeFromUrl = searchParams.get("code") ?? "";
  const [inviteCode, setInviteCode] = useState(codeFromUrl);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    name: string;
    slug: string;
  } | null>(null);

  // Auto-join when logged in and code from URL
  useEffect(() => {
    if (codeFromUrl && firebaseUser && !loading && !success && !joining) {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loading]);

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firebaseUser || !inviteCode.trim()) return;

    setJoining(true);
    setError(null);

    try {
      const res = await fetchWithAuth("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        setError(errData.error ?? "参加に失敗しました");
        return;
      }

      const data = (await res.json()) as { group: { name: string; slug: string } };
      setSuccess({ name: data.group.name, slug: data.group.slug });
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--stitch)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div className="card rounded-lg p-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            style={{ background: "rgba(46, 125, 50, 0.1)", color: "var(--field)" }}
          >
            &#10003;
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            参加完了!
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <strong>{success.name}</strong> に参加しました
          </p>
          <Link
            href={`/groups/${success.slug}`}
            className="mt-5 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "var(--stitch)" }}
          >
            グループを見る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      {/* Back link */}
      <Link
        href="/groups"
        className="inline-flex items-center gap-1 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 4L6 8L10 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        グループ
      </Link>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
          letterSpacing: "0.04em",
          color: "var(--text-primary)",
        }}
      >
        グループに
        <span style={{ color: "var(--stitch)" }}>参加</span>
      </h1>

      {!firebaseUser || !appUser ? (
        <div className="card rounded-lg p-8 text-center">
          <p style={{ color: "var(--text-secondary)" }}>
            グループに参加するにはログインが必要です
          </p>
          <button
            onClick={signIn}
            className="mt-4 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "var(--stitch)" }}
          >
            Googleでログイン
          </button>
        </div>
      ) : (
        <div className="card rounded-lg p-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                招待コード
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) =>
                  setInviteCode(e.target.value.toUpperCase().slice(0, 6))
                }
                placeholder="ABCDEF"
                className="w-full rounded-lg border px-4 py-3 text-center text-lg font-bold tracking-[0.3em]"
                style={{
                  fontFamily: "var(--font-display)",
                  borderColor: error
                    ? "var(--stitch)"
                    : "var(--border-primary)",
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                }}
                maxLength={6}
                required
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--stitch)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={joining || inviteCode.length < 6}
              className="w-full rounded-lg px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--stitch)" }}
            >
              {joining ? "参加中..." : "グループに参加"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
