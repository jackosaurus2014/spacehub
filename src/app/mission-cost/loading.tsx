export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calculator form skeleton */}
          <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-6">
            <div className="h-6 w-48 bg-slate-700/50 rounded" />
            {/* Mission type selector */}
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-700/30 rounded" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-700/20 rounded-lg" />
                ))}
              </div>
            </div>
            {/* Form fields */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-slate-700/30 rounded" />
                <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
              </div>
            ))}
            {/* Range slider */}
            <div className="space-y-2">
              <div className="h-4 w-28 bg-slate-700/30 rounded" />
              <div className="h-2 w-full bg-slate-700/20 rounded-full" />
              <div className="flex justify-between">
                <div className="h-3 w-12 bg-slate-700/20 rounded" />
                <div className="h-3 w-12 bg-slate-700/20 rounded" />
              </div>
            </div>
            {/* Calculate button */}
            <div className="h-11 w-full bg-indigo-500/20 rounded-lg" />
          </div>

          {/* Results area */}
          <div className="space-y-6">
            {/* Cost breakdown card */}
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
              <div className="h-6 w-40 bg-slate-700/50 rounded" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-32 bg-slate-700/30 rounded" />
                  <div className="h-4 w-20 bg-slate-700/40 rounded" />
                </div>
              ))}
              <div className="border-t border-slate-700/30 pt-3 flex justify-between">
                <div className="h-5 w-20 bg-slate-700/50 rounded" />
                <div className="h-5 w-24 bg-slate-700/50 rounded" />
              </div>
            </div>
            {/* Chart placeholder */}
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6">
              <div className="h-6 w-44 bg-slate-700/50 rounded mb-4" />
              <div className="h-48 w-full bg-slate-700/20 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
