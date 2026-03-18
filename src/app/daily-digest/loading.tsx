export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header skeleton */}
        <div className="text-center mb-12">
          <div className="h-4 w-32 bg-white/[0.06] rounded-full animate-pulse mx-auto mb-4" />
          <div className="h-8 w-64 bg-white/[0.08] rounded-lg animate-pulse mx-auto mb-3" />
          <div className="h-4 w-48 bg-white/[0.06] rounded animate-pulse mx-auto" />
        </div>

        {/* Story skeletons */}
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-5 w-16 bg-white/[0.08] rounded-full" />
                <div className="h-3 w-24 bg-white/[0.06] rounded" />
              </div>
              <div className="h-5 w-3/4 bg-white/[0.08] rounded mb-3" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-white/[0.05] rounded" />
                <div className="h-3 w-5/6 bg-white/[0.05] rounded" />
                <div className="h-3 w-2/3 bg-white/[0.05] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
