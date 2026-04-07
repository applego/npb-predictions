export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded" style={{ background: "#0a1525" }} />
          <div className="h-4 w-32 rounded" style={{ background: "#0a1525" }} />
        </div>
        <div className="h-8 w-24 rounded" style={{ background: "#0a1525" }} />
      </div>
      <div
        className="h-64 rounded-xl"
        style={{ background: "#0a1525", border: "1px solid rgba(255,255,255,0.05)" }}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl"
            style={{ background: "#0a1525", border: "1px solid rgba(255,255,255,0.05)" }}
          />
        ))}
      </div>
    </div>
  );
}
