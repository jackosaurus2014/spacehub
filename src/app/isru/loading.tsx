export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-56 sm:w-72 bg-white/[0.06] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 sm:w-96 bg-white/[0.05] rounded animate-pulse mb-8" />

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-28 sm:w-32 bg-white/[0.04] rounded-lg animate-pulse shrink-0" />
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-5 animate-pulse">
              <div className="h-4 w-24 bg-slate-700/50 rounded mb-2" />
              <div className="h-7 w-20 bg-slate-700 rounded mb-1" />
              <div className="h-3 w-32 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Content cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-6 animate-pulse">
              <div className="h-5 w-3/4 bg-slate-700/50 rounded mb-3" />
              <div className="h-3 w-full bg-slate-700/30 rounded mb-2" />
              <div className="h-3 w-5/6 bg-slate-700/30 rounded mb-2" />
              <div className="h-3 w-2/3 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
