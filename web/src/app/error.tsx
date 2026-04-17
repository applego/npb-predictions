"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span
        className="home-plate mb-4 flex h-20 w-20 items-center justify-center text-3xl font-black"
        style={{ background: "var(--text-muted)", color: "#fff" }}
      >
        !
      </span>
      <h1
        className="mb-2 text-2xl"
        style={{
          fontFamily: "var(--font-display, var(--font-display-default))",
          letterSpacing: "0.05em",
        }}
      >
        Something Went Wrong
      </h1>
      <p className="mb-6" style={{ color: "var(--text-muted)" }}>
        エラーが発生しました。もう一度お試しください。
      </p>
      <button
        onClick={reset}
        className="rounded-md px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ background: "var(--stitch)" }}
      >
        再試行
      </button>
    </div>
  );
}
