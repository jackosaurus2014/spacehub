export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Countdown placeholder */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-8 mb-10">
          <div className="text-center space-y-4">
            <div className="h-5 w-40 bg-slate-700/50 rounded mx-auto" />
            <div className="flex justify-center gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-14 w-16 bg-slate-700/40 rounded-lg" />
                  <div className="h-3 w-12 bg-slate-700/30 rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="h-5 w-64 bg-slate-700/40 rounded mx-auto" />
          </div>
        </div>

        {/* Upcoming launch cards */}
        <div className="h-6 w-48 bg-slate-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              {/* Provider badge */}
              <div className="h-5 w-24 bg-blue-500/20 rounded-full" />
              {/* Mission name */}
              <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
              {/* Details */}
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              {/* Date + location row */}
              <div className="flex justify-between pt-2">
                <div className="h-4 w-28 bg-slate-700/30 rounded" />
                <div className="h-4 w-32 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
