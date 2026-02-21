export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-1 w-16 bg-slate-800/60 rounded-full mb-3 animate-pulse" />
          <div className="h-5 w-[32rem] bg-slate-800/50 rounded animate-pulse" />
        </div>

        {/* Report type cards — 2x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4 border border-slate-700/30"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-slate-700/50 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-slate-700/50 rounded" />
                  <div className="h-4 w-full bg-slate-700/30 rounded" />
                  <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-3">
                  <div className="h-4 w-20 bg-slate-700/40 rounded" />
                  <div className="h-4 w-24 bg-slate-700/40 rounded" />
                </div>
                <div className="h-9 w-32 bg-slate-700/50 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
