export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-56 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>
        {/* Search bar */}
        <div className="h-10 w-full max-w-md bg-white/[0.04] rounded-lg animate-pulse mb-8" />
        {/* Profile cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-slate-700/50 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-slate-700/50 rounded" />
                  <div className="h-3 w-20 bg-slate-700/30 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-slate-700/20 rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-white/10 rounded-full" />
                <div className="h-5 w-14 bg-white/10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
