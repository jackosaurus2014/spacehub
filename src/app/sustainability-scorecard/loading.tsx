export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Overall score card skeleton */}
        <div className="h-48 bg-white/[0.04] rounded-2xl animate-pulse mb-8" />

        {/* Criteria bar skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 flex-1 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Operator card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse">
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="h-6 w-32 bg-slate-700/60 rounded" />
                  <div className="h-8 w-12 bg-slate-700/60 rounded-full" />
                </div>
                <div className="h-3 w-full bg-slate-700/40 rounded" />
                <div className="h-3 w-3/4 bg-slate-700/40 rounded" />
                <div className="h-2 w-full bg-slate-700/30 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white/[0.04] rounded-2xl animate-pulse" />
          <div className="h-64 bg-white/[0.04] rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
