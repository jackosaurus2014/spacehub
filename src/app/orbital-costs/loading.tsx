export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-52 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 border-b border-white/[0.06] pb-px">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-28 bg-white/[0.04] rounded-t-lg animate-pulse" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 p-4 border-b border-white/[0.04]">
            <div className="h-4 w-24 bg-slate-700/50 rounded" />
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
            <div className="h-4 w-24 bg-slate-700/50 rounded" />
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 p-4 border-b border-white/[0.08]/10">
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
              <div className="h-4 w-5/6 bg-slate-700/30 rounded" />
              <div className="h-5 w-16 bg-slate-700/20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
