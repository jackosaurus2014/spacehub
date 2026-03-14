export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-32 bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats bar skeleton */}
        <div className="flex gap-6 mb-8">
          <div className="h-10 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Layout: sidebar + grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter sidebar skeleton */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
          </div>

          {/* Job cards skeleton */}
          <div className="flex-1 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/[0.04] rounded-xl animate-pulse p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-700/60 rounded-full shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                    <div className="h-4 w-1/2 bg-slate-700/40 rounded" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
                      <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
                      <div className="h-6 w-14 bg-slate-700/40 rounded-full" />
                    </div>
                  </div>
                  <div className="h-5 w-24 bg-slate-700/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
