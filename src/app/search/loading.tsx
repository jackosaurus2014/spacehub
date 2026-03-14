export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-white/[0.06] rounded-lg animate-pulse mb-6" />

        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 sm:h-14 w-full bg-white/[0.04] rounded-xl animate-pulse" />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-20 sm:w-24 bg-white/[0.04] rounded-full animate-pulse" />
          ))}
        </div>

        {/* Search results list */}
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 sm:p-5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-slate-700 rounded-lg shrink-0 hidden sm:block" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-slate-700 rounded" />
                  <div className="h-3 w-full bg-slate-700/50 rounded" />
                  <div className="h-3 w-1/2 bg-slate-700/50 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
