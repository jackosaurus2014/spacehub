export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats bar skeleton */}
        <div className="h-14 bg-white/[0.04] rounded-xl animate-pulse mb-6" />

        {/* Category tabs skeleton */}
        <div className="flex gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 bg-white/[0.04] rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Filter bar + search skeleton */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 flex-1 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Article card grid -- 3 cols x 4 rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse">
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 bg-slate-700/60 rounded-full" />
                  <div className="h-4 w-16 bg-slate-700/40 rounded" />
                </div>
                <div className="h-5 w-full bg-slate-700/50 rounded" />
                <div className="h-5 w-4/5 bg-slate-700/50 rounded" />
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-3 w-24 bg-slate-700/40 rounded" />
                  <div className="h-5 w-16 bg-slate-700/40 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
