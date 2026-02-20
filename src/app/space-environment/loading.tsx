export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-60 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Tab bar skeleton (3 tabs) */}
        <div className="flex gap-2 mb-8 border-b border-slate-700/50 pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 bg-slate-800/40 rounded-t-lg animate-pulse"
            />
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 mb-8">
          <div className="h-5 w-44 bg-slate-700/50 rounded mb-4" />
          <div className="h-52 w-full bg-slate-700/20 rounded-lg" />
        </div>

        {/* Data cards (2-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3"
            >
              <div className="h-5 w-40 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
