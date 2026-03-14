export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-white/[0.06] rounded-lg animate-pulse mb-6" />

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 animate-pulse">
              <div className="h-4 w-20 bg-slate-700 rounded mb-2" />
              <div className="h-8 w-16 bg-slate-700 rounded" />
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-24 sm:w-28 bg-white/[0.04] rounded-lg animate-pulse shrink-0" />
          ))}
        </div>

        {/* Data table skeleton */}
        <div className="bg-white/[0.04] rounded-xl overflow-hidden animate-pulse">
          {/* Table header */}
          <div className="hidden sm:flex gap-4 p-4 border-b border-white/[0.06]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 flex-1 bg-slate-700 rounded" />
            ))}
          </div>
          {/* Table rows */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-4 border-b border-white/[0.04]">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-4 flex-1 bg-slate-700/50 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
