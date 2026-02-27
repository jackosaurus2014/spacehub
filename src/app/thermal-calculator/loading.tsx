export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header skeleton */}
        <div className="mb-10">
          <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mb-4" />
          <div className="h-9 w-96 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Inputs */}
          <div className="lg:col-span-1 space-y-6">
            {/* Orbit Configuration */}
            <div className="bg-slate-800/40 rounded-2xl animate-pulse p-6 space-y-5">
              <div className="h-6 w-44 bg-slate-700/50 rounded" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-32 bg-slate-700/30 rounded" />
                  <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
                </div>
              ))}
            </div>

            {/* Spacecraft Configuration */}
            <div className="bg-slate-800/40 rounded-2xl animate-pulse p-6 space-y-5">
              <div className="h-6 w-52 bg-slate-700/50 rounded" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-36 bg-slate-700/30 rounded" />
                  <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
                </div>
              ))}
              {/* Material presets */}
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-700/20 rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Temperature results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-slate-800/40 rounded-2xl animate-pulse p-6 text-center">
                  <div className="h-3 w-20 mx-auto bg-slate-700/40 rounded mb-3" />
                  <div className="h-10 w-24 mx-auto bg-slate-700/50 rounded mb-2" />
                  <div className="h-3 w-16 mx-auto bg-slate-700/30 rounded" />
                </div>
              ))}
            </div>

            {/* Power balance */}
            <div className="bg-slate-800/40 rounded-2xl animate-pulse p-6">
              <div className="h-6 w-44 bg-slate-700/50 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <div className="h-4 w-32 bg-slate-700/30 rounded" />
                      <div className="h-4 w-20 bg-slate-700/30 rounded" />
                    </div>
                    <div className="h-2 w-full bg-slate-700/20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Temperature limits */}
            <div className="bg-slate-800/40 rounded-2xl animate-pulse p-6">
              <div className="h-6 w-48 bg-slate-700/50 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 w-full bg-slate-700/20 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Thermal control techniques */}
            <div className="bg-slate-800/40 rounded-2xl animate-pulse p-6">
              <div className="h-6 w-56 bg-slate-700/50 rounded mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 bg-slate-700/20 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
