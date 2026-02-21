export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[480px] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Segment skeletons */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-8">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-6 bg-slate-700/50 rounded animate-pulse" />
              <div className="h-6 w-40 bg-slate-800/50 rounded animate-pulse" />
            </div>
            <div className="h-4 w-96 max-w-full bg-slate-800/40 rounded animate-pulse mb-4" />

            {/* Company cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="bg-slate-800/40 rounded-xl animate-pulse p-4 space-y-2">
                  <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
                  <div className="h-3 w-full bg-slate-700/30 rounded" />
                  <div className="h-3 w-2/3 bg-slate-700/30 rounded" />
                </div>
              ))}
            </div>

            {/* Connector arrow */}
            {i < 3 && (
              <div className="flex justify-center my-4">
                <div className="h-8 w-0.5 bg-slate-700/30 animate-pulse" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
