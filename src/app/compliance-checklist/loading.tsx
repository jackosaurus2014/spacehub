export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Progress bar skeleton */}
        <div className="mb-8 p-4 bg-white/[0.04] rounded-xl">
          <div className="flex justify-between mb-2">
            <div className="h-4 w-32 bg-white/[0.06] rounded animate-pulse" />
            <div className="h-4 w-16 bg-white/[0.06] rounded animate-pulse" />
          </div>
          <div className="h-3 w-full bg-white/[0.06] rounded-full animate-pulse" />
        </div>

        {/* Category skeletons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-6 bg-white/[0.04] rounded-xl overflow-hidden animate-pulse">
            <div className="p-4 border-b border-white/[0.04]">
              <div className="h-5 w-48 bg-slate-700/50 rounded" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="p-4 border-b border-white/[0.02] flex gap-3">
                <div className="h-5 w-5 bg-slate-700/30 rounded shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-slate-700/30 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-700/20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
