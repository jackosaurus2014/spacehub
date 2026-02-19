export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Category grid — 2 rows x 5 cols of small cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/40 rounded-xl animate-pulse flex flex-col items-center justify-center gap-2 p-3">
              <div className="h-8 w-8 bg-slate-700/50 rounded-lg" />
              <div className="h-3 w-16 bg-slate-700/40 rounded" />
            </div>
          ))}
        </div>

        {/* Listing grid — 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700/50 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
                  <div className="h-3 w-1/2 bg-slate-700/40 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
