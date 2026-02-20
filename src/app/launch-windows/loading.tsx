export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Calendar grid placeholder */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 mb-10">
          {/* Month header */}
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-36 bg-slate-700/50 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-slate-700/40 rounded" />
              <div className="h-8 w-8 bg-slate-700/40 rounded" />
            </div>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-4 w-8 bg-slate-700/30 rounded mx-auto" />
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-700/15 rounded" />
            ))}
          </div>
        </div>

        {/* Window cards */}
        <div className="h-6 w-52 bg-slate-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-2/3 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="flex justify-between pt-2">
                <div className="h-4 w-28 bg-slate-700/30 rounded" />
                <div className="h-5 w-16 bg-emerald-500/20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
