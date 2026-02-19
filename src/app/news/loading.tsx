export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Filter bar skeleton — 2 columns */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 flex-1 bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-slate-800/50 rounded-lg animate-pulse" />
        </div>

        {/* Article card grid — 3 cols x 4 rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse">
              <div className="h-40 bg-slate-800/60 rounded-t-xl" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-20 bg-slate-700/60 rounded" />
                <div className="h-5 w-full bg-slate-700/50 rounded" />
                <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                <div className="h-3 w-32 bg-slate-700/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
