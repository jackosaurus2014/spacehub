export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats bar skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-2">
              <div className="h-3 w-20 bg-slate-700/50 rounded" />
              <div className="h-7 w-24 bg-slate-700/40 rounded" />
            </div>
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="flex flex-wrap gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-32 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Investor card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-slate-700/50 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                  <div className="h-3 w-1/2 bg-slate-700/40 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-5/6 bg-slate-700/30 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-14 bg-slate-700/40 rounded-full" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 w-24 bg-slate-700/40 rounded" />
                <div className="h-4 w-16 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
