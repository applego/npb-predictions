export default function PredictionsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-9 w-28 rounded bg-gray-200" />
      </div>
      <div className="mb-6 h-4 w-40 rounded bg-gray-200" />
      {[1, 2].map((i) => (
        <div key={i} className="mb-8">
          <div className="mb-3 h-6 w-36 rounded bg-gray-200" />
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            {[0, 1, 2, 3, 4, 5, 6].map((j) => (
              <div
                key={j}
                className="flex gap-4 border-b px-3 py-2 last:border-0"
              >
                <div className="h-4 w-8 rounded bg-gray-200" />
                {[1, 2, 3, 4, 5].map((k) => (
                  <div key={k} className="h-4 flex-1 rounded bg-gray-200" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
