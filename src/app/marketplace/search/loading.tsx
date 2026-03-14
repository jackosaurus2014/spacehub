export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-56 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>
        {/* Search bar */}
        <div className="h-12 w-full bg-white/[0.04] rounded-lg animate-pulse mb-6" />
        <div className="flex gap-6">
          {/* Filter sidebar */}
          <div className="hidden lg:block w-56 shrink-0 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-4 space-y-3">
                <div className="h-4 w-24 bg-slate-700/40 rounded" />
                <div className="h-3 w-full bg-slate-700/20 rounded" />
                <div className="h-3 w-3/4 bg-slate-700/20 rounded" />
                <div className="h-3 w-5/6 bg-slate-700/20 rounded" />
              </div>
            ))}
          </div>
          {/* Results cards */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
                <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
                <div className="flex gap-2 pt-1">
                  <div className="h-5 w-16 bg-white/10 rounded-full" />
                  <div className="h-5 w-16 bg-white/10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
