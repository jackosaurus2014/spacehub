export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Asteroid table skeleton */}
        <div className="bg-slate-800/30 rounded-xl overflow-hidden mb-8">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 p-4 border-b border-slate-700/50">
            <div className="h-4 w-20 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-700/60 rounded animate-pulse" />
          </div>

          {/* Table rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-4 p-4 border-b border-slate-700/20"
            >
              <div className="h-4 w-28 bg-slate-700/30 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-700/30 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-700/30 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-700/30 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-700/40 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        {/* Resource cards (4 cards in 2x2 grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3"
            >
              <div className="h-5 w-40 bg-slate-700/50 rounded" />
              <div className="h-7 w-28 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
