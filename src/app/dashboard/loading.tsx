export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-slate-800 rounded-lg animate-pulse mb-6" />

        {/* Widget grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Large widget spanning 2 columns */}
          <div className="sm:col-span-2 bg-slate-800/50 rounded-xl p-5 animate-pulse">
            <div className="h-5 w-40 bg-slate-700 rounded mb-4" />
            <div className="h-48 sm:h-64 bg-slate-700/30 rounded-lg" />
          </div>

          {/* Side widget */}
          <div className="bg-slate-800/50 rounded-xl p-5 animate-pulse">
            <div className="h-5 w-32 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-slate-700 rounded shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-full bg-slate-700/50 rounded" />
                    <div className="h-3 w-2/3 bg-slate-700/30 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom row widgets */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-5 animate-pulse">
              <div className="h-5 w-28 bg-slate-700 rounded mb-4" />
              <div className="h-32 bg-slate-700/30 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
