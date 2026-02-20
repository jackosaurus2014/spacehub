export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-52 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row (3 boxes) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-2"
            >
              <div className="h-4 w-28 bg-slate-700/40 rounded" />
              <div className="h-8 w-36 bg-slate-700/50 rounded" />
              <div className="h-3 w-20 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Funding cards grid (3-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3"
            >
              <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 w-24 bg-blue-700/30 rounded" />
                <div className="h-4 w-20 bg-slate-700/30 rounded" />
              </div>
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
