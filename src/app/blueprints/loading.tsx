export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-28 bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Blueprint cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse overflow-hidden">
              {/* Image placeholder */}
              <div className="h-44 w-full bg-slate-700/40" />
              <div className="p-5 space-y-3">
                {/* Title */}
                <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                {/* Specs row */}
                <div className="flex gap-4">
                  <div className="h-4 w-20 bg-slate-700/30 rounded" />
                  <div className="h-4 w-20 bg-slate-700/30 rounded" />
                </div>
                {/* Description */}
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
