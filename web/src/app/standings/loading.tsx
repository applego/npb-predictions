export default function StandingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-36 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-gray-200" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-0"
          >
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="h-4 flex-1 rounded bg-gray-200" />
            <div className="h-4 w-12 rounded bg-gray-200" />
            <div className="h-4 w-12 rounded bg-gray-200" />
            <div className="h-6 w-16 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
