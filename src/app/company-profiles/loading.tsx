export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 w-full max-w-xl bg-slate-800/50 rounded-xl animate-pulse" />
        </div>

        {/* Company card grid — 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-56 bg-slate-800/40 rounded-xl animate-pulse p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-slate-700/50 rounded-lg" />
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
                <div className="h-6 w-14 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
