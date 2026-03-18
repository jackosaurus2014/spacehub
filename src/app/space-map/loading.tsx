export default function SpaceMapLoading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="animate-pulse text-center py-12 mb-8">
          <div className="h-10 w-96 max-w-full bg-white/[0.06] rounded-lg mx-auto mb-4" />
          <div className="h-5 w-[28rem] max-w-full bg-white/[0.05] rounded mx-auto" />
        </div>

        {/* Banner skeleton */}
        <div className="h-20 bg-white/[0.04] rounded-xl animate-pulse mb-8" />

        {/* Market size grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Search skeleton */}
        <div className="h-11 bg-white/[0.04] rounded-lg animate-pulse mb-8" />

        {/* Sector cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-2xl animate-pulse p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/[0.04] rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-1/3 bg-white/[0.04] rounded" />
                  <div className="h-3 w-1/4 bg-white/[0.03] rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-white/[0.03] rounded" />
              <div className="h-3 w-3/4 bg-white/[0.03] rounded" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-16 bg-white/[0.03] rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
