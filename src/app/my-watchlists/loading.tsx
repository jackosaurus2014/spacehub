export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-white/[0.06] rounded-lg animate-pulse mb-6" />

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-28 sm:w-32 bg-white/[0.04] rounded-lg animate-pulse shrink-0" />
          ))}
        </div>

        {/* Watchlist card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 w-32 bg-slate-700 rounded" />
                <div className="h-6 w-6 bg-slate-700 rounded" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-3 w-full bg-slate-700/50 rounded" />
                <div className="h-3 w-2/3 bg-slate-700/50 rounded" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-slate-700/40 rounded" />
                <div className="h-4 w-16 bg-slate-700/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
