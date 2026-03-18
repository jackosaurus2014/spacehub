export default function Loading() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
        <div className="h-4 w-[24rem] bg-white/[0.05] rounded animate-pulse" />
      </div>

      {/* Highlights skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/[0.04] rounded-xl p-5 animate-pulse">
            <div className="h-4 w-24 bg-slate-700/50 rounded-full mb-3" />
            <div className="h-5 w-48 bg-slate-700/50 rounded mb-2" />
            <div className="h-3 w-32 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>

      {/* Calendar grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white/[0.04] rounded-xl p-5 animate-pulse">
            <div className="h-5 w-32 bg-slate-700/50 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-3 w-full bg-slate-700/50 rounded" />
              <div className="h-3 w-3/4 bg-slate-700/50 rounded" />
              <div className="h-3 w-5/6 bg-slate-700/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
