export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-48 bg-white/[0.05] rounded animate-pulse mb-4" />

        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-9 w-96 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-1 w-16 bg-slate-700 rounded-full mb-3" />
          <div className="h-4 w-[480px] max-w-full bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Summary stats — 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-2xl animate-pulse p-5 space-y-2 border border-white/[0.03]">
              <div className="h-3 w-28 bg-slate-700/40 rounded" />
              <div className="h-8 w-24 bg-slate-700/50 rounded" />
              <div className="h-3 w-20 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.05] rounded-xl w-fit">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-32 bg-slate-700/40 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Filter panel skeleton */}
        <div className="bg-white/[0.04] rounded-2xl animate-pulse p-5 mb-6 border border-white/[0.03]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-16 bg-slate-700/40 rounded" />
                <div className="h-10 w-full bg-slate-700/30 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-white/[0.04] rounded-2xl animate-pulse border border-white/[0.03] overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04]">
            {[120, 60, 70, 90, 110, 80, 70].map((w, i) => (
              <div key={i} className="h-3 bg-slate-700/40 rounded" style={{ width: w }} />
            ))}
          </div>
          {/* Data rows */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-white/[0.04]">
              <div className="h-4 w-28 bg-slate-700/30 rounded" />
              <div className="h-5 w-16 bg-slate-700/20 rounded-full" />
              <div className="h-4 w-14 bg-slate-700/30 rounded" />
              <div className="h-4 w-20 bg-slate-700/20 rounded" />
              <div className="h-4 w-24 bg-slate-700/20 rounded" />
              <div className="h-4 w-16 bg-slate-700/20 rounded" />
              <div className="h-5 w-20 bg-slate-700/15 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
