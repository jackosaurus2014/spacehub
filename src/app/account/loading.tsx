export default function Loading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Title skeleton */}
        <div className="h-8 w-48 sm:w-64 bg-white/[0.06] rounded-lg animate-pulse mb-8" />

        {/* Profile section */}
        <div className="bg-white/[0.04] rounded-xl p-5 sm:p-6 animate-pulse mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 bg-slate-700 rounded-full shrink-0" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-700 rounded" />
              <div className="h-3 w-56 bg-slate-700/50 rounded" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="h-3 w-20 bg-slate-700/50 rounded mb-2" />
              <div className="h-10 w-full bg-slate-700/30 rounded-lg" />
            </div>
            <div>
              <div className="h-3 w-24 bg-slate-700/50 rounded mb-2" />
              <div className="h-10 w-full bg-slate-700/30 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Preferences section */}
        <div className="bg-white/[0.04] rounded-xl p-5 sm:p-6 animate-pulse mb-6">
          <div className="h-5 w-32 bg-slate-700 rounded mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-40 bg-slate-700/50 rounded" />
                <div className="h-6 w-11 bg-slate-700/30 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white/[0.04] rounded-xl p-5 sm:p-6 animate-pulse">
          <div className="h-5 w-28 bg-slate-700 rounded mb-4" />
          <div className="h-10 w-36 bg-slate-700/30 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
