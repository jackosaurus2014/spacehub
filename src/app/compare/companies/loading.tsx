export default function CompareCompaniesLoading() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-800 animate-pulse" />
          <div>
            <div className="h-8 w-64 bg-slate-800 rounded animate-pulse" />
            <div className="h-1 w-16 mt-2 bg-slate-800 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="h-5 w-96 bg-slate-800 rounded animate-pulse mt-3" />
      </div>

      {/* Selector skeleton */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 mb-6">
        <div className="h-10 bg-slate-800 rounded-lg animate-pulse mb-4" />
        <div className="flex gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 w-40 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex border-b border-slate-700/30">
            <div className="w-44 p-4 shrink-0">
              <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="flex-1 flex gap-4 p-4">
              <div className="h-4 flex-1 bg-slate-800 rounded animate-pulse" />
              <div className="h-4 flex-1 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
