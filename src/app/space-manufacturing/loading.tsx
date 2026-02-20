export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-8 border-b border-slate-700/50 pb-2">
          <div className="h-10 w-36 bg-slate-800/40 rounded-t-lg animate-pulse" />
          <div className="h-10 w-28 bg-slate-800/40 rounded-t-lg animate-pulse" />
        </div>

        {/* Facility cards grid (3-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3"
            >
              <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-24 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
