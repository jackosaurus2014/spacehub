export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-12 bg-white/[0.05] rounded animate-pulse" />
          <div className="h-4 w-3 bg-white/[0.03] rounded animate-pulse" />
          <div className="h-4 w-12 bg-white/[0.05] rounded animate-pulse" />
          <div className="h-4 w-3 bg-white/[0.03] rounded animate-pulse" />
          <div className="h-4 w-24 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Header skeleton */}
        <div className="text-center mb-10">
          <div className="h-10 w-80 mx-auto bg-white/[0.06] rounded-lg animate-pulse mb-4" />
          <div className="h-4 w-full max-w-2xl mx-auto bg-white/[0.04] rounded animate-pulse mb-2" />
          <div className="h-4 w-3/4 max-w-xl mx-auto bg-white/[0.04] rounded animate-pulse" />
        </div>

        {/* Progress bar skeleton */}
        <div className="bg-white/[0.04] rounded-xl p-5 mb-10 animate-pulse">
          <div className="flex justify-between mb-3">
            <div className="h-4 w-24 bg-slate-700/40 rounded" />
            <div className="h-4 w-20 bg-slate-700/40 rounded" />
          </div>
          <div className="h-3 w-full bg-slate-700/30 rounded-full" />
        </div>

        {/* Step cards skeleton */}
        <div className="space-y-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 animate-pulse">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-slate-700/40 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-48 bg-slate-700/50 rounded" />
                  <div className="h-3 w-full bg-slate-700/30 rounded" />
                  <div className="h-3 w-3/4 bg-slate-700/30 rounded" />
                  <div className="h-9 w-24 bg-slate-700/40 rounded-lg mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
