export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-10 w-10 bg-slate-800 rounded-lg animate-pulse" />
            <div>
              <div className="h-8 w-56 bg-slate-800 rounded animate-pulse mb-2" />
              <div className="h-1 w-16 bg-slate-800 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="h-5 w-96 bg-slate-800/60 rounded animate-pulse mt-3" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse"
            >
              <div className="h-3 w-20 bg-slate-800 rounded mb-2" />
              <div className="h-7 w-12 bg-slate-700 rounded" />
            </div>
          ))}
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-1 mb-6 bg-slate-900 rounded-lg p-1 w-fit">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-28 bg-slate-800/60 rounded-md animate-pulse"
            />
          ))}
        </div>

        {/* Rule cards skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 bg-slate-700 rounded" />
                    <div className="h-5 w-48 bg-slate-700 rounded" />
                    <div className="h-5 w-14 bg-slate-700 rounded" />
                  </div>
                  <div className="h-3 w-64 bg-slate-800 rounded mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 w-24 bg-slate-800 rounded" />
                    <div className="h-6 w-16 bg-slate-800 rounded" />
                    <div className="h-6 w-20 bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-11 h-6 bg-slate-700 rounded-full" />
                  <div className="w-7 h-7 bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
