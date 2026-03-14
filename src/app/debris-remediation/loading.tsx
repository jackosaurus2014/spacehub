export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-60 bg-white/[0.06] rounded mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-8 animate-pulse overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-28 bg-white/[0.04] rounded-lg shrink-0" />
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4">
              <div className="h-3 w-24 bg-slate-700/40 rounded mb-2" />
              <div className="h-7 w-16 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Company cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-1/2 bg-slate-700/50 rounded" />
                <div className="h-5 w-20 bg-slate-700/40 rounded-full" />
              </div>
              <div className="h-3 w-full bg-slate-700/20 rounded" />
              <div className="h-3 w-3/4 bg-slate-700/20 rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-slate-700/30 rounded-full" />
                <div className="h-5 w-16 bg-slate-700/30 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
