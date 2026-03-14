export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-40 sm:w-56 bg-white/[0.06] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-56 sm:w-72 bg-white/[0.05] rounded animate-pulse mb-8" />

        {/* Filter bar */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 w-24 bg-white/[0.04] rounded-lg animate-pulse shrink-0" />
          ))}
        </div>

        {/* Podcast cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-5 animate-pulse">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-16 w-16 bg-slate-700/50 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full bg-slate-700/50 rounded" />
                  <div className="h-3 w-2/3 bg-slate-700/30 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-slate-700/30 rounded mb-2" />
              <div className="h-3 w-5/6 bg-slate-700/30 rounded mb-4" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-slate-700/20 rounded" />
                <div className="h-8 w-16 bg-slate-700/40 rounded min-h-[44px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
