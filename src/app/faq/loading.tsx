export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Title skeleton */}
        <div className="text-center mb-8">
          <div className="h-8 w-56 sm:w-72 bg-white/[0.06] rounded-lg animate-pulse mx-auto mb-3" />
          <div className="h-4 w-48 sm:w-64 bg-white/[0.05] rounded animate-pulse mx-auto" />
        </div>

        {/* Search bar */}
        <div className="h-12 w-full bg-white/[0.04] rounded-xl animate-pulse mb-8" />

        {/* Accordion list */}
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl p-4 sm:p-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-5 w-3/4 bg-slate-700 rounded" />
                <div className="h-5 w-5 bg-slate-700 rounded shrink-0 ml-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
