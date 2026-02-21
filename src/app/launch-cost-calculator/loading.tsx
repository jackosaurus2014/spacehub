export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header skeleton */}
        <div className="mb-10">
          <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mb-4" />
          <div className="h-9 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-xl animate-pulse p-4 text-center"
            >
              <div className="h-3 w-20 mx-auto bg-slate-700/40 rounded mb-2" />
              <div className="h-7 w-16 mx-auto bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-5">
              <div className="h-6 w-40 bg-slate-700/50 rounded" />

              {/* Payload mass slider */}
              <div className="space-y-2">
                <div className="h-4 w-28 bg-slate-700/30 rounded" />
                <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
                <div className="h-2 w-full bg-slate-700/20 rounded-full" />
              </div>

              {/* Orbit dropdown */}
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-700/30 rounded" />
                <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
              </div>

              {/* Volume input */}
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-700/30 rounded" />
                <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
              </div>

              {/* Mission type toggle */}
              <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-700/30 rounded" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 bg-slate-700/20 rounded-lg" />
                  <div className="h-10 bg-slate-700/20 rounded-lg" />
                </div>
              </div>

              {/* Sort dropdown */}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-slate-700/30 rounded" />
                <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Results panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart placeholder */}
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6">
              <div className="h-6 w-52 bg-slate-700/50 rounded mb-4" />
              <div className="h-64 w-full bg-slate-700/20 rounded-lg" />
            </div>

            {/* Vehicle cards */}
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-slate-800/40 rounded-xl animate-pulse p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="h-5 w-44 bg-slate-700/50 rounded mb-2" />
                      <div className="h-4 w-28 bg-slate-700/30 rounded" />
                    </div>
                    <div className="h-6 w-24 bg-slate-700/40 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j}>
                        <div className="h-3 w-16 bg-slate-700/30 rounded mb-1" />
                        <div className="h-5 w-20 bg-slate-700/40 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
