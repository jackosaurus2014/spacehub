export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-white/[0.06] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 sm:w-80 bg-white/[0.05] rounded animate-pulse mb-8" />

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 animate-pulse">
              <div className="h-4 w-20 bg-slate-700 rounded mb-2" />
              <div className="h-8 w-16 bg-slate-700 rounded" />
            </div>
          ))}
        </div>

        {/* Offering cards - stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl overflow-hidden animate-pulse">
              <div className="h-40 sm:h-48 bg-slate-700/30" />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-slate-700/40 rounded-full" />
                  <div className="h-5 w-20 bg-slate-700/40 rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-slate-700 rounded" />
                <div className="h-3 w-full bg-slate-700/50 rounded" />
                <div className="h-3 w-2/3 bg-slate-700/50 rounded" />
                <div className="flex items-center justify-between mt-4">
                  <div className="h-6 w-24 bg-slate-700 rounded" />
                  <div className="h-9 w-24 bg-slate-700/50 rounded-lg min-h-[44px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
