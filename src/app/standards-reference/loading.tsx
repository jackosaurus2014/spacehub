export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Organizations grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-2xl p-5 animate-pulse">
              <div className="h-5 w-16 bg-slate-700/50 rounded mb-2" />
              <div className="h-3 w-full bg-slate-700/30 rounded mb-1" />
              <div className="h-3 w-3/4 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Search bar skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="h-11 flex-1 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-11 w-40 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-11 w-40 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-11 w-32 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse overflow-hidden">
          <div className="grid grid-cols-5 gap-4 p-4 border-b border-white/[0.04]">
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
            <div className="h-4 w-28 bg-slate-700/50 rounded" />
            <div className="h-4 w-24 bg-slate-700/50 rounded" />
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 p-4 border-b border-white/[0.08]/10">
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              <div className="h-4 w-5/6 bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
              <div className="h-5 w-16 bg-slate-700/20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
