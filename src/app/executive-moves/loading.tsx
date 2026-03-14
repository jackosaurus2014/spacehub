export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Notable moves highlight skeleton — 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-white/[0.04] rounded-xl animate-pulse p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-700/50 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                    <div className="h-3 w-1/2 bg-slate-700/40 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-700/30 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-24 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Search/filter bar skeleton */}
        <div className="mb-6">
          <div className="h-12 w-full bg-white/[0.04] rounded-xl animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.03] rounded-lg animate-pulse flex items-center px-4 gap-4">
              <div className="h-4 w-32 bg-slate-700/40 rounded" />
              <div className="h-4 w-40 bg-slate-700/30 rounded" />
              <div className="h-4 w-8 bg-slate-700/20 rounded" />
              <div className="h-4 w-40 bg-slate-700/30 rounded" />
              <div className="h-4 w-24 bg-slate-700/20 rounded" />
              <div className="h-6 w-20 bg-slate-700/40 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
