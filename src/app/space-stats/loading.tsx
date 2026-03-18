export default function SpaceStatsLoading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="animate-pulse text-center py-12 mb-8">
          <div className="h-10 w-[32rem] max-w-full bg-white/[0.06] rounded-lg mx-auto mb-4" />
          <div className="h-5 w-[28rem] max-w-full bg-white/[0.05] rounded mx-auto mb-2" />
          <div className="h-4 w-[24rem] max-w-full bg-white/[0.04] rounded mx-auto" />
        </div>

        {/* Top-level stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Section skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-12">
            <div className="h-7 w-48 bg-white/[0.06] rounded mb-6 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
                  <div className="h-8 w-24 bg-white/[0.04] rounded" />
                  <div className="h-4 w-full bg-white/[0.03] rounded" />
                  <div className="h-3 w-3/4 bg-white/[0.03] rounded" />
                  <div className="h-3 w-1/2 bg-white/[0.02] rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
