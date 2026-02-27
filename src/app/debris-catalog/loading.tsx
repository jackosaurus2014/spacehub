export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mb-4" />
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[480px] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-2xl animate-pulse p-5 space-y-3"
            >
              <div className="h-4 w-20 bg-slate-700/50 rounded" />
              <div className="h-8 w-24 bg-slate-700/30 rounded" />
              <div className="h-3 w-16 bg-slate-700/20 rounded" />
            </div>
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-36 bg-slate-800/40 rounded-lg animate-pulse" />
          ))}
          <div className="h-10 flex-1 max-w-xs bg-slate-800/40 rounded-lg animate-pulse ml-auto" />
        </div>

        {/* Timeline skeleton */}
        <div className="bg-slate-800/40 rounded-2xl animate-pulse p-6 mb-8">
          <div className="h-6 w-52 bg-slate-700/50 rounded mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-12 bg-slate-700/40 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-64 bg-slate-700/30 rounded" />
                  <div className="h-3 w-full bg-slate-700/20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two column cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-2xl animate-pulse p-5 space-y-3"
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
