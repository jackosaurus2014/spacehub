export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title skeleton */}
        <div className="text-center mb-10">
          <div className="h-8 w-40 sm:w-56 bg-slate-800 rounded-lg animate-pulse mx-auto mb-3" />
          <div className="h-4 w-64 sm:w-96 bg-slate-800/60 rounded animate-pulse mx-auto" />
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="h-10 w-52 bg-slate-800/50 rounded-full animate-pulse" />
        </div>

        {/* Pricing tiers - stack on mobile, row on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`bg-slate-800/50 rounded-xl p-6 sm:p-8 animate-pulse ${
                i === 1 ? 'ring-2 ring-cyan-500/30' : ''
              }`}
            >
              <div className="h-5 w-24 bg-slate-700 rounded mb-2" />
              <div className="h-10 w-32 bg-slate-700 rounded mb-4" />
              <div className="h-3 w-full bg-slate-700/50 rounded mb-6" />
              {/* Feature list */}
              <div className="space-y-3 mb-8">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-slate-700 rounded shrink-0" />
                    <div className="h-3 flex-1 bg-slate-700/50 rounded" />
                  </div>
                ))}
              </div>
              {/* CTA button */}
              <div className="h-12 w-full bg-slate-700/50 rounded-lg min-h-[44px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
