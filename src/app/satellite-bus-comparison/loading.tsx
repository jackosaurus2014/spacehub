export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-40 bg-slate-800/60 rounded animate-pulse mb-4" />
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-2xl p-4 animate-pulse">
              <div className="h-7 w-12 bg-slate-700/50 rounded mx-auto mb-2" />
              <div className="h-3 w-20 bg-slate-700/30 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-28 bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse overflow-hidden">
          <div className="h-12 bg-slate-700/30 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-t border-slate-700/20">
              <div className="h-4 w-28 bg-slate-700/40 rounded" />
              <div className="h-4 w-36 bg-slate-700/30 rounded" />
              <div className="h-4 w-20 bg-slate-700/20 rounded" />
              <div className="h-4 w-16 bg-slate-700/30 rounded" />
              <div className="h-4 w-24 bg-slate-700/20 rounded" />
              <div className="h-4 w-20 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
