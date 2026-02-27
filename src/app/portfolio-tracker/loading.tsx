export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mb-4" />
          <div className="h-8 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Market overview skeleton */}
        <div className="bg-slate-800/40 rounded-xl p-6 mb-8 animate-pulse">
          <div className="h-6 w-48 bg-slate-700/50 rounded mb-4" />
          <div className="flex items-baseline gap-3 mb-6">
            <div className="h-10 w-40 bg-slate-700/50 rounded" />
            <div className="h-6 w-24 bg-slate-700/50 rounded" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                <div className="h-4 w-20 bg-slate-700/50 rounded mb-2" />
                <div className="h-6 w-28 bg-slate-700/50 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-slate-800/40 rounded-xl p-6 mb-8 animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-56 bg-slate-700/50 rounded" />
            <div className="h-10 w-64 bg-slate-700/50 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-12 w-full bg-slate-700/30 rounded" />
            ))}
          </div>
        </div>

        {/* Sector cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-5 animate-pulse">
              <div className="h-5 w-32 bg-slate-700/50 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-700/50 rounded mb-2" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-700/50 rounded" />
                <div className="h-3 w-full bg-slate-700/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
