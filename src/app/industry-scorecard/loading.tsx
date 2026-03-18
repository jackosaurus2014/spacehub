export default function Loading() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
        <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
      </div>

      {/* Overall grade skeleton */}
      <div className="bg-white/[0.04] rounded-xl p-8 mb-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-48 bg-slate-700/50 rounded mb-3" />
            <div className="h-4 w-64 bg-slate-700/50 rounded" />
          </div>
          <div className="h-20 w-20 bg-slate-700/50 rounded-xl" />
        </div>
      </div>

      {/* Dimension cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white/[0.04] rounded-xl p-5 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 bg-slate-700/50 rounded" />
              <div className="h-10 w-10 bg-slate-700/50 rounded-lg" />
            </div>
            <div className="h-3 w-full bg-slate-700/50 rounded mb-2" />
            <div className="h-3 w-3/4 bg-slate-700/50 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-700/50 rounded" />
              <div className="h-3 w-5/6 bg-slate-700/50 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Methodology skeleton */}
      <div className="bg-white/[0.04] rounded-xl p-6 animate-pulse">
        <div className="h-5 w-32 bg-slate-700/50 rounded mb-3" />
        <div className="h-3 w-full bg-slate-700/50 rounded mb-2" />
        <div className="h-3 w-4/5 bg-slate-700/50 rounded" />
      </div>
    </div>
  );
}
