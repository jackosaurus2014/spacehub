export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <div className="h-4 w-40 bg-slate-800/40 rounded animate-pulse mb-6" />

        {/* Insight hero */}
        <div className="mb-8 space-y-4">
          <div className="h-6 w-28 bg-purple-500/20 rounded-full animate-pulse" />
          <div className="h-8 w-3/4 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-slate-800/60 rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-4 w-28 bg-slate-800/40 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-800/40 rounded animate-pulse" />
          </div>
        </div>

        {/* Content body skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-full bg-slate-800/40 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-800/40 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-800/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
