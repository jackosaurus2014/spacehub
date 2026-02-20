export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Calendar controls skeleton */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-slate-800/40 rounded animate-pulse" />
            <div className="h-10 w-24 bg-slate-800/40 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-slate-800/40 rounded animate-pulse" />
        </div>

        {/* Event cards skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-6 bg-slate-800/40 rounded-xl p-6 animate-pulse">
              <div className="w-20 flex-shrink-0">
                <div className="h-16 bg-slate-700/50 rounded-lg" />
              </div>
              <div className="flex-1">
                <div className="h-6 w-64 bg-slate-700/50 rounded mb-3" />
                <div className="h-4 w-full bg-slate-700/50 rounded mb-2" />
                <div className="h-4 w-3/4 bg-slate-700/50 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 w-24 bg-slate-700/50 rounded" />
                  <div className="h-6 w-20 bg-slate-700/50 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
