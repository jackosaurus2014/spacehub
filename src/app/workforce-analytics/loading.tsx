export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-white/[0.05] rounded animate-pulse mb-3" />
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[500px] max-w-full bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Overview stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 text-center">
              <div className="h-4 w-24 mx-auto bg-slate-700/50 rounded animate-pulse mb-3" />
              <div className="h-8 w-20 mx-auto bg-slate-700/50 rounded animate-pulse mb-2" />
              <div className="h-3 w-32 mx-auto bg-slate-700/30 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Sector chart skeleton */}
        <div className="card p-6 mb-8">
          <div className="h-6 w-48 bg-slate-700/50 rounded animate-pulse mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-36 bg-slate-700/40 rounded animate-pulse" />
                <div className="flex-1 h-6 bg-slate-700/30 rounded animate-pulse" style={{ width: `${80 - i * 8}%` }} />
                <div className="h-4 w-16 bg-slate-700/40 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="card overflow-hidden mb-8">
          <div className="p-6 border-b border-white/[0.06]">
            <div className="h-6 w-40 bg-slate-700/50 rounded animate-pulse" />
          </div>
          <div className="p-4 bg-white/[0.03] border-b border-white/[0.06] flex gap-8">
            <div className="h-4 w-8 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-700/50 rounded animate-pulse" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-white/[0.04] flex gap-8">
              <div className="h-4 w-6 bg-slate-700/40 rounded animate-pulse" />
              <div className="h-4 w-36 bg-slate-700/40 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-700/40 rounded animate-pulse" />
              <div className="h-4 w-28 bg-slate-700/40 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-700/40 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Skills + Geography grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-6 w-44 bg-slate-700/50 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-slate-700/40 rounded animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-3/4 bg-slate-700/40 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-slate-700/30 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
