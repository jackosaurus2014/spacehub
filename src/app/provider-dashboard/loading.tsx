export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-4 space-y-2">
              <div className="h-3 w-20 bg-slate-700/30 rounded" />
              <div className="h-8 w-16 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 mb-6 border-b border-white/[0.06] pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-28 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Content cards */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-700/50 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-56 bg-slate-700/50 rounded" />
                <div className="h-3 w-40 bg-slate-700/30 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
