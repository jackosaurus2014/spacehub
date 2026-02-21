export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-4 animate-pulse">
              <div className="h-3 w-20 bg-slate-700/50 rounded mb-2" />
              <div className="h-7 w-12 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Upcoming section */}
        <div className="mb-8">
          <div className="h-5 w-48 bg-slate-800/50 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-14 bg-slate-700/50 rounded" />
                  <div className="h-5 w-16 bg-slate-700/30 rounded-full" />
                </div>
                <div className="h-4 w-full bg-slate-700/40 rounded mb-2" />
                <div className="h-3 w-3/4 bg-slate-700/30 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* View toggle and filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-1 bg-slate-800/40 rounded-lg p-1">
            <div className="h-9 w-24 bg-slate-700/50 rounded-md animate-pulse" />
            <div className="h-9 w-24 bg-slate-700/30 rounded-md animate-pulse" />
          </div>
          <div className="flex gap-3 ml-auto">
            <div className="h-9 w-32 bg-slate-800/40 rounded-lg animate-pulse" />
            <div className="h-9 w-28 bg-slate-800/40 rounded-lg animate-pulse" />
            <div className="h-9 w-28 bg-slate-800/40 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Calendar grid skeleton */}
        <div className="bg-slate-800/30 rounded-xl overflow-hidden animate-pulse">
          {/* Month header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/30">
            <div className="h-6 w-8 bg-slate-700/40 rounded" />
            <div className="h-6 w-40 bg-slate-700/50 rounded" />
            <div className="h-6 w-8 bg-slate-700/40 rounded" />
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px bg-slate-700/20">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="p-2 text-center">
                <div className="h-4 w-8 bg-slate-700/30 rounded mx-auto" />
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="grid grid-cols-7 gap-px">
              {Array.from({ length: 7 }).map((_, col) => (
                <div key={col} className="h-24 bg-slate-800/20 p-2">
                  <div className="h-4 w-6 bg-slate-700/30 rounded mb-2" />
                  {(row + col) % 3 === 0 && (
                    <div className="h-2 w-10 bg-slate-700/20 rounded" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
