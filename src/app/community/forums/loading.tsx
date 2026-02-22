export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-72 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Search / filter bar */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 flex-1 bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-slate-800/50 rounded-lg animate-pulse" />
        </div>

        {/* Forum list */}
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-700/50 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-56 bg-slate-700/50 rounded" />
                <div className="h-3 w-40 bg-slate-700/30 rounded" />
              </div>
              <div className="hidden md:block">
                <div className="h-4 w-20 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
