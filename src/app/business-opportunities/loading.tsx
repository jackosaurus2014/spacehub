export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-2">
              <div className="h-4 w-24 bg-slate-700/30 rounded" />
              <div className="h-7 w-16 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Opportunity cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              {/* Status badge */}
              <div className="h-5 w-16 bg-emerald-500/20 rounded-full" />
              {/* Title */}
              <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
              {/* Description */}
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              {/* Footer row */}
              <div className="flex justify-between pt-2">
                <div className="h-4 w-20 bg-slate-700/30 rounded" />
                <div className="h-4 w-24 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
