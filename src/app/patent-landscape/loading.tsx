export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-white/[0.05] rounded animate-pulse mb-3" />
          <div className="h-8 w-96 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] max-w-full bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats row — 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-6 text-center space-y-2">
              <div className="h-3 w-24 bg-slate-700/40 rounded mx-auto" />
              <div className="h-8 w-20 bg-slate-700/50 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Search/filter bar */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-4 mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="h-10 w-64 bg-slate-700/40 rounded-lg" />
            <div className="h-10 w-40 bg-slate-700/40 rounded-lg" />
            <div className="h-10 w-40 bg-slate-700/40 rounded-lg" />
            <div className="h-10 w-32 bg-slate-700/40 rounded-lg" />
          </div>
        </div>

        {/* Two-column content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Patent Holders */}
          <div className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
            <div className="h-5 w-48 bg-slate-700/50 rounded" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 bg-slate-700/40 rounded" />
                  <div className="h-4 w-32 bg-slate-700/30 rounded" />
                </div>
                <div className="h-4 w-16 bg-slate-700/30 rounded" />
              </div>
            ))}
          </div>

          {/* Patent Categories */}
          <div className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
            <div className="h-5 w-40 bg-slate-700/50 rounded" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-4 w-40 bg-slate-700/30 rounded" />
                  <div className="h-4 w-12 bg-slate-700/30 rounded" />
                </div>
                <div className="h-3 bg-slate-700/20 rounded-full">
                  <div
                    className="h-3 bg-slate-700/40 rounded-full"
                    style={{ width: `${80 - i * 8}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emerging areas */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
          <div className="h-5 w-52 bg-slate-700/50 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-slate-700/20 rounded-lg p-4 space-y-2">
                <div className="h-4 w-36 bg-slate-700/30 rounded" />
                <div className="h-3 w-full bg-slate-700/20 rounded" />
                <div className="h-3 w-3/4 bg-slate-700/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
