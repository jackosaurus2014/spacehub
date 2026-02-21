export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats bar skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 animate-pulse">
              <div className="h-8 w-24 bg-slate-700/50 rounded mb-2 mx-auto" />
              <div className="h-3 w-20 bg-slate-700/30 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-24 bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="bg-slate-800/40 rounded-xl p-4 mb-6 animate-pulse">
          <div className="flex flex-wrap gap-4">
            <div className="h-10 w-64 bg-slate-700/50 rounded-lg" />
            <div className="h-10 w-36 bg-slate-700/50 rounded-lg" />
            <div className="h-10 w-36 bg-slate-700/50 rounded-lg" />
          </div>
        </div>

        {/* Deal cards skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-slate-700/50 rounded" />
                <div className="h-6 w-16 bg-slate-700/50 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 w-72 bg-slate-700/50 rounded mb-2" />
                  <div className="h-3 w-48 bg-slate-700/30 rounded" />
                </div>
                <div className="h-6 w-24 bg-slate-700/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
