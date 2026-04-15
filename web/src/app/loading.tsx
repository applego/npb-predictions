export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded" style={{ background: "var(--bg-surface)" }} />
          <div className="h-4 w-32 rounded" style={{ background: "var(--bg-surface)" }} />
        </div>
        <div className="h-8 w-24 rounded" style={{ background: "var(--bg-surface)" }} />
      </div>
      <div
        className="h-64 rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
          />
        ))}
      </div>
    </div>
  );
}
