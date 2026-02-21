export default function Loading() {
  return (
    <div className="min-h-screen py-8 bg-space-900">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Controls row */}
        <div className="flex gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 bg-slate-800/40 rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Main graph + sidebar layout */}
        <div className="flex gap-6">
          {/* Graph area */}
          <div className="flex-1 bg-slate-800/30 rounded-xl animate-pulse aspect-[16/10] flex items-center justify-center">
            <div className="text-slate-700 text-sm">Loading graph...</div>
          </div>

          {/* Detail panel */}
          <div className="w-80 hidden lg:block space-y-4">
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
            </div>
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-1/2 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
