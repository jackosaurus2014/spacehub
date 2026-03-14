export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Loading status message */}
        <div className="flex items-center gap-2 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-sm text-slate-400">Loading live data...</span>
        </div>

        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-2">
              <div className="h-4 w-20 bg-slate-700/30 rounded" />
              <div className="h-8 w-16 bg-slate-700/50 rounded" />
              <div className="h-3 w-24 bg-slate-700/20 rounded" />
            </div>
          ))}
        </div>

        {/* Large chart placeholder */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-6 mb-10">
          <div className="h-6 w-44 bg-slate-700/50 rounded mb-4" />
          <div className="h-64 w-full bg-slate-700/20 rounded-lg" />
        </div>

        {/* Activity cards grid */}
        <div className="h-6 w-40 bg-white/[0.06] rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              {/* Activity type badge */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-emerald-500/40 rounded-full" />
                <div className="h-4 w-20 bg-slate-700/30 rounded" />
              </div>
              {/* Title */}
              <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
              {/* Description */}
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              {/* Timestamp */}
              <div className="h-3 w-24 bg-slate-700/20 rounded pt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
