export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-96 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 animate-pulse">
              <div className="h-7 w-10 bg-slate-700/50 rounded mx-auto mb-2" />
              <div className="h-3 w-20 bg-slate-700/30 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Activity selection skeleton */}
        <div className="mb-8">
          <div className="h-5 w-52 bg-white/[0.06] rounded animate-pulse mb-2" />
          <div className="h-3 w-72 bg-white/[0.04] rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border border-white/[0.2]" />
                  <div className="flex-1">
                    <div className="h-4 w-36 bg-slate-700/40 rounded mb-2" />
                    <div className="h-3 w-full bg-slate-700/20 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty state skeleton */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-16 animate-pulse">
          <div className="h-10 w-10 bg-slate-700/30 rounded-full mx-auto mb-4" />
          <div className="h-5 w-48 bg-slate-700/40 rounded mx-auto mb-2" />
          <div className="h-3 w-80 bg-slate-700/20 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}
