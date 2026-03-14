export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-40 bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Template buttons skeleton */}
        <div className="flex flex-wrap gap-3 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-36 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Config panel skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <div className="bg-white/[0.04] rounded-2xl animate-pulse p-6 space-y-4">
              <div className="h-6 w-48 bg-slate-700/50 rounded" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-28 bg-slate-700/30 rounded" />
                  <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
                </div>
              ))}
              <div className="h-12 w-full bg-white/[0.04] rounded-lg" />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/[0.04] rounded-2xl animate-pulse p-6 space-y-3">
                <div className="h-6 w-44 bg-slate-700/50 rounded" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="space-y-2">
                      <div className="h-4 w-20 bg-slate-700/30 rounded" />
                      <div className="h-6 w-24 bg-slate-700/50 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
