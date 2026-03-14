export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-40 bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-3 mb-8">
          <div className="h-10 w-36 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Cost comparison chart skeleton */}
        <div className="card p-6 mb-8">
          <div className="h-6 w-56 bg-slate-700/50 rounded animate-pulse mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-32 bg-slate-700/30 rounded animate-pulse flex-shrink-0" />
                <div
                  className="h-8 bg-slate-700/40 rounded animate-pulse"
                  style={{ width: `${Math.max(10, 100 - i * 8)}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Market and revenue cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-6 w-48 bg-slate-700/50 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-slate-700/30 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-slate-700/20 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-700/20 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Vehicle deep dive skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-slate-700/40 rounded animate-pulse" />
                <div className="h-5 w-5 bg-slate-700/30 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
