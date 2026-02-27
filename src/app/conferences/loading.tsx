export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mb-4" />
          <div className="h-8 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-2xl p-6 text-center animate-pulse">
              <div className="h-8 w-16 mx-auto bg-slate-700/60 rounded mb-2" />
              <div className="h-3 w-24 mx-auto bg-slate-700/40 rounded" />
            </div>
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="bg-slate-800/40 rounded-2xl p-4 mb-8 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-700/50 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Event card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-2xl animate-pulse">
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="h-5 w-16 bg-slate-700/60 rounded-full" />
                  <div className="h-5 w-20 bg-slate-700/40 rounded" />
                </div>
                <div className="h-6 w-full bg-slate-700/50 rounded" />
                <div className="h-4 w-3/4 bg-slate-700/40 rounded" />
                <div className="h-4 w-1/2 bg-slate-700/40 rounded" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-16 bg-slate-700/30 rounded-full" />
                  <div className="h-6 w-20 bg-slate-700/30 rounded-full" />
                  <div className="h-6 w-14 bg-slate-700/30 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
