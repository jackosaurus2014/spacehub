export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-96 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Overall risk score skeleton */}
        <div className="flex justify-center mb-10">
          <div className="w-52 h-52 rounded-full bg-slate-800/40 animate-pulse" />
        </div>

        {/* Risk category cards — 6 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-slate-700/50 rounded" />
                <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
              </div>
              <div className="h-2 w-full bg-slate-700/30 rounded-full" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-700/20 rounded" />
                <div className="h-3 w-3/4 bg-slate-700/20 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Watch list skeleton */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 mb-8">
          <div className="h-5 w-64 bg-slate-700/50 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-52 bg-slate-700/30 rounded" />
                <div className="h-4 w-20 bg-slate-700/30 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Lead time bars skeleton */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-5">
          <div className="h-5 w-48 bg-slate-700/50 rounded mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-40 h-4 bg-slate-700/30 rounded" />
                <div className="flex-1 h-6 bg-slate-700/20 rounded" />
                <div className="w-24 h-4 bg-slate-700/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
