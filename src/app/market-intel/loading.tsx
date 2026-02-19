export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row — 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-2">
              <div className="h-3 w-24 bg-slate-700/40 rounded" />
              <div className="h-8 w-20 bg-slate-700/50 rounded" />
              <div className="h-3 w-32 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Content grid — 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-slate-700/50 rounded" />
                <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
              </div>
              <div className="h-32 w-full bg-slate-700/20 rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 w-24 bg-slate-700/30 rounded" />
                <div className="h-3 w-20 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
