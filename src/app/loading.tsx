export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Hero section skeleton */}
        <div className="animate-pulse text-center py-16 mb-12">
          <div className="h-10 w-80 bg-slate-800 rounded-lg mx-auto mb-4" />
          <div className="h-5 w-[32rem] max-w-full bg-slate-800/60 rounded mx-auto mb-6" />
          <div className="h-12 w-48 bg-nebula-600/30 rounded-xl mx-auto" />
        </div>

        {/* Stats bar skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Module grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700/50 rounded-lg" />
                <div className="h-5 w-2/3 bg-slate-700/50 rounded" />
              </div>
              <div className="h-3 w-full bg-slate-700/30 rounded" />
              <div className="h-3 w-3/4 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
