export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row — 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-4 space-y-2">
              <div className="h-3 w-20 bg-slate-700/40 rounded" />
              <div className="h-7 w-16 bg-slate-700/50 rounded" />
              <div className="h-3 w-24 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Satellite card grid — 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-slate-700/50 rounded" />
                  <div className="h-3 w-24 bg-slate-700/40 rounded" />
                </div>
                <div className="h-8 w-20 bg-slate-700/40 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="h-3 w-12 bg-slate-700/30 rounded" />
                  <div className="h-4 w-16 bg-slate-700/40 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-12 bg-slate-700/30 rounded" />
                  <div className="h-4 w-16 bg-slate-700/40 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-12 bg-slate-700/30 rounded" />
                  <div className="h-4 w-16 bg-slate-700/40 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
