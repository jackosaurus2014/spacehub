export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="h-4 w-44 bg-white/[0.04] rounded animate-pulse mb-6" />

        {/* RFQ header */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-6 mb-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-20 bg-amber-500/20 rounded-full" />
            <div className="h-6 w-24 bg-slate-700/40 rounded-full" />
          </div>
          <div className="h-7 w-3/4 bg-slate-700/50 rounded" />
          <div className="h-4 w-full bg-slate-700/30 rounded" />
          <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
          <div className="flex gap-6">
            <div className="h-4 w-28 bg-slate-700/30 rounded" />
            <div className="h-4 w-32 bg-slate-700/30 rounded" />
            <div className="h-4 w-24 bg-slate-700/30 rounded" />
          </div>
        </div>

        {/* Proposals section */}
        <div className="h-6 w-36 bg-white/[0.06] rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700/50 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-slate-700/50 rounded" />
                  <div className="h-3 w-32 bg-slate-700/30 rounded" />
                </div>
                <div className="h-8 w-20 bg-slate-700/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
