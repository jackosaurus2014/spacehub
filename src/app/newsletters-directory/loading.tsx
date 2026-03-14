export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="h-12 w-full max-w-md bg-white/[0.04] rounded-xl animate-pulse" />
          <div className="h-12 w-40 bg-white/[0.04] rounded-xl animate-pulse" />
        </div>

        {/* Category tabs skeleton */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-white/[0.04] rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>

        {/* Newsletter card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-52 bg-white/[0.04] rounded-xl animate-pulse p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-700/50 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                    <div className="h-3 w-1/2 bg-slate-700/40 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-4/5 bg-slate-700/30 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Podcast section skeleton */}
        <div className="mb-8">
          <div className="h-7 w-48 bg-white/[0.06] rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
