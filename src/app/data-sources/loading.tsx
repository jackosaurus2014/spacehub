export default function DataSourcesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header skeleton */}
        <div className="text-center space-y-4 mb-10">
          <div className="h-10 w-64 bg-white/[0.06] rounded-lg mx-auto animate-pulse" />
          <div className="h-5 w-96 max-w-full bg-white/[0.04] rounded-lg mx-auto animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="h-8 w-16 bg-white/[0.06] rounded mx-auto animate-pulse mb-2" />
              <div className="h-3 w-20 bg-white/[0.04] rounded mx-auto animate-pulse" />
            </div>
          ))}
        </div>

        {/* Category skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card mb-8 overflow-hidden">
            <div className="p-6 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-white/[0.06] rounded animate-pulse" />
                  <div className="h-3 w-64 bg-white/[0.04] rounded animate-pulse" />
                </div>
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="px-6 py-4 border-b border-white/[0.04]">
                <div className="h-4 w-32 bg-white/[0.06] rounded animate-pulse mb-2" />
                <div className="h-3 w-full bg-white/[0.04] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
