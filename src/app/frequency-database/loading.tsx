export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Band overview cards — 4x2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700/50 rounded-lg" />
                <div className="space-y-1.5">
                  <div className="h-4 w-20 bg-slate-700/50 rounded" />
                  <div className="h-3 w-28 bg-slate-700/30 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-slate-700/30 rounded" />
              <div className="h-3 w-3/4 bg-slate-700/20 rounded" />
            </div>
          ))}
        </div>

        {/* Search bar skeleton */}
        <div className="mb-6">
          <div className="h-10 w-full bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Filter row */}
        <div className="flex gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-32 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-white/[0.04]">
              <div className="h-4 w-28 bg-slate-700/40 rounded" />
              <div className="h-4 w-16 bg-slate-700/30 rounded" />
              <div className="h-4 w-20 bg-slate-700/40 rounded" />
              <div className="h-4 w-24 bg-slate-700/30 rounded" />
              <div className="h-4 w-32 bg-slate-700/40 rounded" />
              <div className="h-4 w-20 bg-slate-700/30 rounded" />
              <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
