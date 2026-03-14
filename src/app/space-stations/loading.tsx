export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-white/[0.06] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 sm:w-80 bg-white/[0.05] rounded animate-pulse mb-8" />

        {/* Featured station card */}
        <div className="bg-white/[0.04] rounded-xl p-5 sm:p-6 animate-pulse mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="h-40 sm:h-48 sm:w-64 bg-slate-700/30 rounded-lg shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-700/50 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
              <div className="flex gap-2 mt-4">
                <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Station cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 animate-pulse">
              <div className="h-32 bg-slate-700/30 rounded-lg mb-3" />
              <div className="h-5 w-3/4 bg-slate-700 rounded mb-2" />
              <div className="h-3 w-full bg-slate-700/50 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
