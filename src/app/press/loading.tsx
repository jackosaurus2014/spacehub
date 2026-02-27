export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-slate-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 sm:w-80 bg-slate-800/60 rounded animate-pulse mb-8" />

        {/* Press release list */}
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-5 sm:p-6 animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="sm:w-28 shrink-0">
                  <div className="h-4 w-24 bg-slate-700/50 rounded" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-slate-700 rounded" />
                  <div className="h-3 w-full bg-slate-700/50 rounded" />
                  <div className="h-3 w-2/3 bg-slate-700/50 rounded" />
                  <div className="h-4 w-24 bg-slate-700/30 rounded mt-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
