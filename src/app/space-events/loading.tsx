export default function Loading() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
        <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-800/40 rounded-xl p-4 animate-pulse">
            <div className="h-8 w-12 bg-slate-700/50 rounded mx-auto mb-2" />
            <div className="h-3 w-20 bg-slate-700/50 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-lg p-1 w-fit border border-slate-700/50">
        <div className="h-8 w-28 bg-slate-700/50 rounded-md animate-pulse" />
        <div className="h-8 w-24 bg-slate-700/50 rounded-md animate-pulse" />
        <div className="h-8 w-20 bg-slate-700/50 rounded-md animate-pulse" />
      </div>

      {/* Highlighted events skeleton */}
      <div className="mb-8">
        <div className="h-5 w-48 bg-slate-800 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-5 border-l-4 border-l-slate-700 animate-pulse">
              <div className="h-4 w-20 bg-slate-700/50 rounded-full mb-3" />
              <div className="h-5 w-48 bg-slate-700/50 rounded mb-2" />
              <div className="h-3 w-32 bg-slate-700/50 rounded mb-1" />
              <div className="h-3 w-40 bg-slate-700/50 rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-slate-700/50 rounded" />
                <div className="h-6 w-16 bg-slate-700/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="bg-slate-800/40 rounded-xl p-4 mb-6 animate-pulse">
        <div className="h-9 w-full bg-slate-700/50 rounded-lg mb-4" />
        <div className="flex flex-wrap gap-3">
          <div className="h-7 w-24 bg-slate-700/50 rounded-lg" />
          <div className="h-7 w-28 bg-slate-700/50 rounded-lg" />
          <div className="h-7 w-24 bg-slate-700/50 rounded-lg" />
          <div className="h-7 w-28 bg-slate-700/50 rounded-lg" />
          <div className="h-7 w-20 bg-slate-700/50 rounded-lg" />
        </div>
      </div>

      {/* Event cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex gap-4 bg-slate-800/40 rounded-xl p-4 animate-pulse">
            <div className="w-16 flex-shrink-0 text-center">
              <div className="h-4 w-10 bg-slate-700/50 rounded mx-auto mb-1" />
              <div className="h-8 w-8 bg-slate-700/50 rounded mx-auto mb-1" />
              <div className="h-3 w-8 bg-slate-700/50 rounded mx-auto" />
            </div>
            <div className="flex-1">
              <div className="h-5 w-64 bg-slate-700/50 rounded mb-2" />
              <div className="flex gap-2 mb-2">
                <div className="h-4 w-20 bg-slate-700/50 rounded-full" />
                <div className="h-4 w-32 bg-slate-700/50 rounded" />
                <div className="h-4 w-28 bg-slate-700/50 rounded" />
              </div>
              <div className="h-4 w-full bg-slate-700/50 rounded mb-1" />
              <div className="h-4 w-3/4 bg-slate-700/50 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-slate-700/50 rounded-full" />
                <div className="h-5 w-20 bg-slate-700/50 rounded-full" />
                <div className="h-5 w-16 bg-slate-700/50 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
