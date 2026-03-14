export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <div className="h-4 w-52 bg-white/[0.04] rounded animate-pulse mb-6" />

        {/* Article hero */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-blue-500/20 rounded-full animate-pulse" />
            <div className="h-6 w-20 bg-slate-700/40 rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-3/4 bg-white/[0.06] rounded animate-pulse" />
          <div className="h-4 w-full bg-white/[0.05] rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
            <div className="h-4 w-24 bg-white/[0.04] rounded animate-pulse" />
          </div>
        </div>

        {/* Content body skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-full bg-white/[0.04] rounded animate-pulse" />
              <div className="h-4 w-full bg-white/[0.04] rounded animate-pulse" />
              <div className="h-4 w-3/5 bg-white/[0.04] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
