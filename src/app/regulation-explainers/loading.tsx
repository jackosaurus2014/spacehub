export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-56 sm:w-72 bg-slate-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 sm:w-96 bg-slate-800/60 rounded animate-pulse mb-8" />

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-24 sm:w-28 bg-slate-800/50 rounded-full animate-pulse" />
          ))}
        </div>

        {/* Explainer list */}
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 sm:p-5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-slate-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-slate-700 rounded" />
                  <div className="h-3 w-full bg-slate-700/50 rounded" />
                  <div className="h-3 w-2/3 bg-slate-700/50 rounded" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-5 w-16 bg-slate-700/30 rounded-full" />
                    <div className="h-5 w-20 bg-slate-700/30 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
