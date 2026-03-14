export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-56 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>
        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-4 w-24 bg-slate-700/40 rounded" />
              <div className="h-8 w-20 bg-slate-700/50 rounded" />
              <div className="h-3 w-16 bg-green-500/20 rounded" />
            </div>
          ))}
        </div>
        {/* Chart placeholders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-5 space-y-4">
              <div className="h-5 w-36 bg-slate-700/40 rounded" />
              <div className="h-48 w-full bg-slate-700/20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
