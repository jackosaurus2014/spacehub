export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-10 md:pt-20 md:pb-14">
          <div className="text-center space-y-4 animate-pulse">
            <div className="h-5 w-48 bg-white/[0.04] rounded-full mx-auto" />
            <div className="h-10 w-96 max-w-full bg-white/[0.06] rounded-lg mx-auto" />
            <div className="h-5 w-72 bg-white/[0.03] rounded mx-auto" />
            <div className="flex justify-center gap-6 mt-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 w-24 bg-white/[0.03] rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
              <div className="h-8 w-16 bg-white/[0.06] rounded mb-2" />
              <div className="h-3 w-24 bg-white/[0.03] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Sections skeleton */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-8 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-white/[0.04] rounded-xl" />
              <div className="h-5 w-40 bg-white/[0.06] rounded" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[1, 2, 3].map(j => (
                <div key={j} className="bg-white/[0.02] rounded-lg p-3">
                  <div className="h-6 w-12 bg-white/[0.06] rounded mb-1" />
                  <div className="h-3 w-20 bg-white/[0.03] rounded" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-white/[0.03] rounded" />
              <div className="h-3 w-4/5 bg-white/[0.03] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
