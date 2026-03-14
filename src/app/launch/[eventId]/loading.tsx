export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="h-4 w-36 bg-white/[0.04] rounded animate-pulse mb-6" />

        {/* Launch event hero */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-6 mb-8 space-y-4">
          <div className="h-5 w-24 bg-green-500/20 rounded-full" />
          <div className="h-8 w-2/3 bg-slate-700/50 rounded" />
          <div className="h-4 w-48 bg-slate-700/30 rounded" />

          {/* Countdown */}
          <div className="flex gap-4 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1 text-center">
                <div className="h-12 w-14 bg-slate-700/40 rounded-lg" />
                <div className="h-3 w-10 bg-slate-700/30 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-36 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-28 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
