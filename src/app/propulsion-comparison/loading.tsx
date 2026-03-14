export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] max-w-full bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-4 space-y-2">
              <div className="h-3 w-20 bg-slate-700/40 rounded" />
              <div className="h-7 w-16 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-4 mb-8 flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-36 bg-slate-700/40 rounded-lg" />
          ))}
        </div>

        {/* Technology cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-10 w-10 bg-slate-700/40 rounded-lg" />
              <div className="h-5 w-32 bg-slate-700/50 rounded" />
              <div className="h-3 w-full bg-slate-700/30 rounded" />
              <div className="h-3 w-3/4 bg-slate-700/30 rounded" />
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-4 w-20 bg-slate-700/40 rounded" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-white/[0.04] flex gap-4">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className={`h-4 bg-slate-700/30 rounded ${j === 0 ? 'w-28' : 'w-16'}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
