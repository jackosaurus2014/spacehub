export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <div className="h-4 w-48 bg-white/[0.04] rounded animate-pulse mb-6" />

        {/* Thread title */}
        <div className="mb-6">
          <div className="h-7 w-3/4 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-700/50 rounded-full" />
            <div className="h-4 w-32 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-4 w-24 bg-white/[0.04] rounded animate-pulse" />
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700/50 rounded-full shrink-0" />
                <div className="space-y-1">
                  <div className="h-4 w-28 bg-slate-700/50 rounded" />
                  <div className="h-3 w-20 bg-slate-700/30 rounded" />
                </div>
              </div>
              <div className="space-y-2 pl-13">
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-5/6 bg-slate-700/30 rounded" />
                <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              </div>
              <div className="flex gap-4 pl-13">
                <div className="h-6 w-14 bg-slate-700/20 rounded" />
                <div className="h-6 w-14 bg-slate-700/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
