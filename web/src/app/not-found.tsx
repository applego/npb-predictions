import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span
        className="home-plate mb-4 flex h-20 w-20 items-center justify-center text-3xl font-black"
        style={{ background: "var(--stitch)", color: "#fff" }}
      >
        404
      </span>
      <h1
        className="mb-2 text-2xl"
        style={{
          fontFamily: "var(--font-display, var(--font-display-default))",
          letterSpacing: "0.05em",
        }}
      >
        Page Not Found
      </h1>
      <p className="mb-6" style={{ color: "var(--text-muted)" }}>
        お探しのページは見つかりませんでした。
      </p>
      <Link
        href="/"
        className="rounded-md px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ background: "var(--stitch)" }}
      >
        トップに戻る
      </Link>
    </div>
  );
}
