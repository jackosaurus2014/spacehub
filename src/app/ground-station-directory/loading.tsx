export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-40 bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-6 text-center">
              <div className="h-4 w-20 mx-auto bg-slate-700/50 rounded mb-2" />
              <div className="h-8 w-16 mx-auto bg-slate-700/40 rounded" />
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div className="h-12 w-full bg-white/[0.04] rounded-xl animate-pulse mb-8" />

        {/* Provider cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-slate-700/40 rounded-lg" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-slate-700/50 rounded mb-2" />
                  <div className="h-3 w-24 bg-slate-700/30 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              </div>
              <div className="flex gap-2 mt-4">
                <div className="h-6 w-16 bg-slate-700/30 rounded-full" />
                <div className="h-6 w-16 bg-slate-700/30 rounded-full" />
                <div className="h-6 w-16 bg-slate-700/30 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse overflow-hidden">
          <div className="h-12 bg-slate-700/30" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 border-t border-white/[0.03] flex items-center gap-4 px-4">
              <div className="h-4 w-32 bg-slate-700/30 rounded" />
              <div className="h-4 w-16 bg-slate-700/30 rounded" />
              <div className="h-4 w-24 bg-slate-700/30 rounded" />
              <div className="h-4 w-28 bg-slate-700/30 rounded" />
              <div className="h-4 w-20 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
