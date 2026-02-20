export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-8 border-b border-slate-700/50 pb-2">
          <div className="h-10 w-36 bg-slate-800/40 rounded-t-lg animate-pulse" />
          <div className="h-10 w-28 bg-slate-800/40 rounded-t-lg animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="bg-slate-800/30 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-700/50">
            <div className="h-4 w-14 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-14 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-700/60 rounded animate-pulse" />
          </div>

          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-4 p-4 border-b border-slate-700/20"
            >
              <div className="h-4 w-24 bg-slate-700/30 rounded animate-pulse" />
              <div className="h-4 w-32 bg-slate-700/30 rounded animate-pulse" />
              <div className="h-4 w-28 bg-slate-700/30 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-700/40 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
