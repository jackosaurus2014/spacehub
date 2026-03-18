export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-[26rem] bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[30rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 animate-pulse">
              <div className="h-7 w-10 bg-slate-700/50 rounded mx-auto mb-2" />
              <div className="h-3 w-20 bg-slate-700/30 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Search skeleton */}
        <div className="mb-6">
          <div className="h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl animate-pulse" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-1 mb-8 border-b border-white/[0.06] pb-px">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 w-36 bg-white/[0.04] rounded-t-lg animate-pulse" />
          ))}
        </div>

        {/* Info banner skeleton */}
        <div className="h-20 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-8 animate-pulse" />

        {/* Cards skeleton */}
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden animate-pulse">
              <div className="h-12 bg-white/[0.04] border-b border-white/[0.06]" />
              <div className="p-5 space-y-4">
                <div className="h-4 w-64 bg-slate-700/40 rounded" />
                <div className="h-3 w-full bg-slate-700/20 rounded" />
                <div className="h-3 w-5/6 bg-slate-700/20 rounded" />
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-slate-700/30 rounded" />
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="h-3 w-full bg-slate-700/15 rounded" />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-slate-700/30 rounded" />
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="h-3 w-full bg-slate-700/15 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
