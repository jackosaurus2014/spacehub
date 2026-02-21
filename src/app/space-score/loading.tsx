export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[500px] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-slate-800/50 rounded-lg animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5">
              <div className="h-3 w-20 bg-slate-700/50 rounded mb-2" />
              <div className="h-7 w-16 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="bg-slate-800/30 rounded-xl p-4 mb-6 flex gap-3">
          <div className="h-10 flex-1 bg-slate-700/30 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-slate-700/30 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-slate-700/30 rounded-lg animate-pulse" />
        </div>

        {/* Leaderboard rows */}
        <div className="space-y-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-4 flex items-center gap-4">
              <div className="h-6 w-8 bg-slate-700/50 rounded" />
              <div className="h-10 w-10 bg-slate-700/50 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-700/50 rounded" />
                <div className="h-3 w-24 bg-slate-700/40 rounded" />
              </div>
              <div className="h-6 w-12 bg-slate-700/50 rounded" />
              <div className="h-3 w-28 bg-slate-700/30 rounded-full" />
              <div className="h-5 w-16 bg-slate-700/40 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
