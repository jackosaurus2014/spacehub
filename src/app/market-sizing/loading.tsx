export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Chart area skeleton */}
        <div className="bg-slate-800/40 rounded-xl p-6 mb-8 animate-pulse">
          <div className="h-6 w-48 bg-slate-700/50 rounded mb-6" />
          <div className="h-96 bg-slate-700/50 rounded" />
        </div>

        {/* Data table skeleton */}
        <div className="bg-slate-800/40 rounded-xl p-6 animate-pulse">
          <div className="h-6 w-40 bg-slate-700/50 rounded mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-12 w-1/4 bg-slate-700/50 rounded" />
                <div className="h-12 w-1/4 bg-slate-700/50 rounded" />
                <div className="h-12 w-1/4 bg-slate-700/50 rounded" />
                <div className="h-12 w-1/4 bg-slate-700/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
