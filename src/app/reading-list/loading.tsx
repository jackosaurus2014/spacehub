export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header skeleton */}
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-44 bg-slate-800 rounded mb-3" />
          <div className="h-4 w-64 bg-slate-800/60 rounded" />
        </div>

        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-6 animate-pulse">
          <div className="h-9 w-16 bg-slate-800/50 rounded-lg" />
          <div className="h-9 w-20 bg-slate-800/50 rounded-lg" />
          <div className="h-9 w-16 bg-slate-800/50 rounded-lg" />
        </div>

        {/* Reading list items skeleton */}
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-xl">
              <div className="h-5 w-5 bg-slate-700/40 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
                <div className="flex gap-3">
                  <div className="h-3 w-20 bg-slate-700/30 rounded" />
                  <div className="h-3 w-16 bg-slate-700/30 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-slate-700/30 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
