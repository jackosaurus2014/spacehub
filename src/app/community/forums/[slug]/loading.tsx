export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Forum header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-32 bg-slate-800/40 rounded animate-pulse mb-4" />
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* New thread button placeholder */}
        <div className="flex justify-end mb-6">
          <div className="h-10 w-36 bg-blue-500/20 rounded-lg animate-pulse" />
        </div>

        {/* Thread list */}
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-700/50 rounded-full shrink-0" />
                <div className="h-5 w-3/5 bg-slate-700/50 rounded" />
              </div>
              <div className="flex items-center gap-4 pl-11">
                <div className="h-3 w-24 bg-slate-700/30 rounded" />
                <div className="h-3 w-20 bg-slate-700/30 rounded" />
                <div className="h-3 w-16 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
