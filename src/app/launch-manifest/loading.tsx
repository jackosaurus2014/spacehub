export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 animate-pulse">
              <div className="h-3 w-24 bg-slate-700/40 rounded mb-2" />
              <div className="h-7 w-16 bg-slate-700/60 rounded" />
            </div>
          ))}
        </div>

        {/* Calendar grid skeleton */}
        <div className="bg-white/[0.04] rounded-2xl p-6 animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-40 bg-slate-700/50 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-slate-700/40 rounded" />
              <div className="h-8 w-8 bg-slate-700/40 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`h-${i}`} className="h-5 bg-slate-700/30 rounded" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={`d-${i}`} className="h-20 bg-slate-700/20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
