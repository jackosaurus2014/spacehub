export default function StartupDirectoryLoading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="animate-pulse text-center py-12 mb-8">
          <div className="h-10 w-80 max-w-full bg-white/[0.06] rounded-lg mx-auto mb-4" />
          <div className="h-5 w-[26rem] max-w-full bg-white/[0.05] rounded mx-auto" />
        </div>

        {/* Banner skeleton */}
        <div className="h-20 bg-white/[0.04] rounded-xl animate-pulse mb-8" />

        {/* Sector stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Stage stats skeleton */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Search skeleton */}
        <div className="h-11 bg-white/[0.04] rounded-lg animate-pulse mb-8" />

        {/* Startup cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/3 bg-white/[0.04] rounded" />
                <div className="h-4 w-16 bg-white/[0.04] rounded-full" />
              </div>
              <div className="h-3 w-full bg-white/[0.03] rounded" />
              <div className="h-3 w-2/3 bg-white/[0.03] rounded" />
              <div className="flex items-center gap-3">
                <div className="h-3 w-12 bg-white/[0.03] rounded" />
                <div className="h-3 w-16 bg-white/[0.03] rounded" />
                <div className="h-3 w-20 bg-white/[0.03] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
