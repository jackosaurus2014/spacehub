export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-56 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-4 space-y-3">
              <div className="h-7 w-12 bg-slate-700/50 rounded" />
              <div className="h-3 w-20 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
        {/* Chart placeholder */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-5 mb-6" style={{ height: '180px' }} />
        {/* Error rows */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
          <div className="h-5 w-36 bg-slate-700/40 rounded mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-700/20 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
