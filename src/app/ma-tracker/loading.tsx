export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mb-4" />
          <div className="h-8 w-96 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row — 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-2">
              <div className="h-3 w-24 bg-slate-700/40 rounded" />
              <div className="h-8 w-28 bg-slate-700/50 rounded" />
              <div className="h-3 w-36 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-4 mb-6 flex gap-4 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-36 bg-slate-700/40 rounded-lg" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
          <div className="h-10 w-full bg-slate-700/30 rounded" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 w-full bg-slate-700/20 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
