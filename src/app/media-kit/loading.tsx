export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-white/[0.06] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 sm:w-80 bg-white/[0.05] rounded animate-pulse mb-8" />

        {/* Quick links bar skeleton */}
        <div className="bg-white/[0.04] rounded-xl p-4 mb-8 flex justify-center gap-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-6 w-20 bg-slate-700/30 rounded" />
          ))}
        </div>

        {/* Brand assets section skeleton */}
        <div className="bg-white/[0.04] rounded-xl p-8 mb-8 animate-pulse">
          <div className="h-6 w-32 bg-slate-700 rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white/[0.04] rounded-xl p-6">
                <div className="h-28 bg-slate-700/30 rounded-lg mb-3" />
                <div className="h-4 w-32 bg-slate-700/50 rounded" />
              </div>
            ))}
          </div>
          <div className="h-6 w-32 bg-slate-700 rounded mb-4" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="h-14 bg-slate-700/30 rounded-lg mb-1" />
                <div className="h-3 w-16 bg-slate-700/50 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-6 text-center animate-pulse">
              <div className="h-8 w-12 bg-slate-700 rounded mx-auto mb-2" />
              <div className="h-4 w-24 bg-slate-700/50 rounded mx-auto mb-1" />
              <div className="h-3 w-32 bg-slate-700/30 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
