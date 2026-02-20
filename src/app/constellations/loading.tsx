export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Constellation cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-4">
              {/* Icon + name row */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700/50 rounded-lg" />
                <div className="h-5 w-36 bg-slate-700/50 rounded" />
              </div>
              {/* Satellite count */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 bg-slate-700/30 rounded" />
                <div className="h-6 w-12 bg-indigo-500/20 rounded" />
              </div>
              {/* Description */}
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              {/* Status badge */}
              <div className="h-5 w-20 bg-emerald-500/20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
