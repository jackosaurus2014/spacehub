export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-slate-800 rounded-lg animate-pulse mb-6" />

        {/* Featured live card */}
        <div className="bg-slate-800/50 rounded-xl p-5 sm:p-6 animate-pulse mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-3 w-3 bg-red-500/50 rounded-full" />
            <div className="h-4 w-16 bg-slate-700 rounded" />
          </div>
          <div className="h-6 w-3/4 bg-slate-700 rounded mb-3" />
          <div className="h-4 w-full bg-slate-700/50 rounded mb-2" />
          <div className="h-4 w-1/2 bg-slate-700/50 rounded" />
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 bg-slate-700 rounded-full" />
                <div className="h-4 w-20 bg-slate-700 rounded" />
              </div>
              <div className="h-8 w-16 bg-slate-700 rounded mb-1" />
              <div className="h-3 w-24 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
