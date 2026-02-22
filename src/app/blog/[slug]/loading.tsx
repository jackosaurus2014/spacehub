export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <div className="h-4 w-36 bg-slate-800/40 rounded animate-pulse mb-6" />

        {/* Blog post hero */}
        <div className="mb-8 space-y-4">
          <div className="h-6 w-20 bg-blue-500/20 rounded-full animate-pulse" />
          <div className="h-8 w-3/4 bg-slate-800 rounded animate-pulse" />
          <div className="h-5 w-full bg-slate-800/60 rounded animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-700/50 rounded-full" />
            <div className="space-y-1">
              <div className="h-4 w-32 bg-slate-800/40 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-800/30 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Featured image placeholder */}
        <div className="h-64 w-full bg-slate-800/40 rounded-xl animate-pulse mb-8" />

        {/* Content body skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-full bg-slate-800/40 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-800/40 rounded animate-pulse" />
              <div className="h-4 w-3/5 bg-slate-800/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
