export default function ExplorerLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar skeleton */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-28 bg-slate-800 rounded animate-pulse" />
            <div className="h-5 w-2 bg-slate-800 rounded animate-pulse" />
            <div className="h-5 w-24 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left panel skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
              <div className="h-10 bg-slate-800 rounded animate-pulse" />
              <div className="h-10 bg-slate-800 rounded animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
              <div className="h-12 bg-cyan-500/20 rounded animate-pulse" />
            </div>
          </div>

          {/* Right panel skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-32 bg-slate-800 rounded animate-pulse" />
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="h-64 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
