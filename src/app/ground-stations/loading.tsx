export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Map placeholder */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse mb-8 overflow-hidden">
          <div className="h-80 w-full bg-slate-700/30 flex items-center justify-center">
            <div className="h-12 w-12 bg-slate-700/40 rounded-full" />
          </div>
        </div>

        {/* Station list */}
        <div className="space-y-4">
          <div className="h-6 w-40 bg-slate-800 rounded animate-pulse mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 flex items-center gap-5">
              {/* Status indicator */}
              <div className="h-3 w-3 bg-emerald-500/30 rounded-full flex-shrink-0" />
              {/* Station info */}
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-slate-700/50 rounded" />
                <div className="h-4 w-32 bg-slate-700/30 rounded" />
              </div>
              {/* Location */}
              <div className="h-4 w-28 bg-slate-700/30 rounded flex-shrink-0" />
              {/* Frequency */}
              <div className="h-4 w-20 bg-slate-700/30 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
