export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Vehicle cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse overflow-hidden">
              {/* Image area */}
              <div className="h-48 w-full bg-slate-700/40" />
              <div className="p-5 space-y-3">
                {/* Vehicle name */}
                <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                {/* Manufacturer */}
                <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
                {/* Specs grid */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="space-y-1">
                    <div className="h-3 w-16 bg-slate-700/20 rounded" />
                    <div className="h-4 w-20 bg-slate-700/40 rounded" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 w-16 bg-slate-700/20 rounded" />
                    <div className="h-4 w-20 bg-slate-700/40 rounded" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 w-16 bg-slate-700/20 rounded" />
                    <div className="h-4 w-20 bg-slate-700/40 rounded" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 w-16 bg-slate-700/20 rounded" />
                    <div className="h-4 w-20 bg-slate-700/40 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
