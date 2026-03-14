export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Title + actions skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 w-20 bg-white/[0.04] rounded-lg animate-pulse shrink-0" />
          ))}
        </div>

        {/* Notification list */}
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 animate-pulse flex items-start gap-3">
              <div className="h-10 w-10 bg-slate-700 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-slate-700 rounded" />
                <div className="h-3 w-full bg-slate-700/50 rounded" />
                <div className="h-3 w-24 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
