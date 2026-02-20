export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-60 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Planet grid (large cards, 2-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-xl animate-pulse overflow-hidden"
            >
              {/* Image placeholder */}
              <div className="h-48 w-full bg-slate-700/40" />
              <div className="p-6 space-y-3">
                <div className="h-6 w-40 bg-slate-700/50 rounded" />
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
                <div className="flex gap-3 pt-2">
                  <div className="h-6 w-24 bg-slate-700/40 rounded-full" />
                  <div className="h-6 w-28 bg-slate-700/40 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
