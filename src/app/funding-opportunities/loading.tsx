export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        <div className="flex gap-6">
          {/* Filter sidebar skeleton */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-slate-800/40 rounded-xl p-6 animate-pulse">
              <div className="h-6 w-24 bg-slate-700/50 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-slate-700/50 rounded" />
                ))}
              </div>
            </div>
          </div>

          {/* Funding list skeleton */}
          <div className="flex-1 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl p-6 animate-pulse">
                <div className="h-6 w-64 bg-slate-700/50 rounded mb-3" />
                <div className="h-4 w-full bg-slate-700/50 rounded mb-2" />
                <div className="h-4 w-5/6 bg-slate-700/50 rounded mb-4" />
                <div className="flex gap-3">
                  <div className="h-8 w-24 bg-slate-700/50 rounded" />
                  <div className="h-8 w-32 bg-slate-700/50 rounded" />
                  <div className="h-8 w-28 bg-slate-700/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
