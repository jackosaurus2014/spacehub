export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-52 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 w-full max-w-xl bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Patent cards grid (2-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3"
            >
              <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 w-28 bg-slate-700/30 rounded" />
                <div className="h-3 w-24 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
