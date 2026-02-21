export default function Loading() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
        <div className="h-4 w-[480px] max-w-full bg-slate-800/60 rounded animate-pulse" />
      </div>

      {/* Search + filter row skeleton */}
      <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 h-10 bg-slate-700/30 rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-slate-700/30 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-slate-700/30 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-slate-700/30 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Results count skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-32 bg-slate-700/40 rounded animate-pulse" />
        <div className="h-8 w-24 bg-slate-700/30 rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-slate-800/30 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-slate-700/50">
          <div className="col-span-2 h-4 w-20 bg-slate-700/60 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-700/60 rounded animate-pulse" />
          <div className="h-4 w-14 bg-slate-700/60 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-700/60 rounded animate-pulse" />
          <div className="h-4 w-12 bg-slate-700/60 rounded animate-pulse" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-4 p-4 border-b border-slate-700/20"
          >
            <div className="col-span-2 space-y-2">
              <div className="h-4 w-full bg-slate-700/30 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-slate-700/20 rounded animate-pulse" />
            </div>
            <div className="h-4 w-28 bg-slate-700/30 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-700/30 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-700/30 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-700/40 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
