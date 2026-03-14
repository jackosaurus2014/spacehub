export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Spectrum bar skeleton */}
        <div className="h-20 w-full bg-white/[0.04] rounded-xl animate-pulse mb-8" />

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.03] rounded-2xl p-6 animate-pulse"
            >
              <div className="h-5 w-24 bg-slate-700/60 rounded mb-4" />
              <div className="h-4 w-full bg-slate-700/30 rounded mb-2" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded mb-2" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
