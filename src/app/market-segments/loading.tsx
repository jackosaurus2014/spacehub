export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-40 bg-white/[0.05] rounded animate-pulse mb-3" />
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Total market stat skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-6 mb-8 flex items-center gap-8">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-700/50 rounded" />
            <div className="h-10 w-32 bg-slate-700/60 rounded" />
          </div>
          <div className="h-12 w-px bg-slate-700/30" />
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-700/50 rounded" />
            <div className="h-10 w-32 bg-slate-700/60 rounded" />
          </div>
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-36 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Segment cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-44 bg-slate-700/40 rounded" />
              <div className="h-8 w-24 bg-slate-700/50 rounded" />
              <div className="h-3 w-20 bg-emerald-700/30 rounded" />
              <div className="h-3 w-full bg-slate-700/20 rounded" />
              <div className="h-3 w-3/4 bg-slate-700/20 rounded" />
            </div>
          ))}
        </div>

        {/* Treemap skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-6 mb-8">
          <div className="h-5 w-56 bg-slate-700/50 rounded mb-4" />
          <div className="h-72 w-full bg-slate-700/20 rounded-lg" />
        </div>

        {/* Growth matrix skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-6 mb-8">
          <div className="h-5 w-48 bg-slate-700/50 rounded mb-4" />
          <div className="h-72 w-full bg-slate-700/20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
