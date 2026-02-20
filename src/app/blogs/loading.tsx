export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Featured posts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
              {/* Featured image placeholder */}
              <div className="h-48 w-full bg-slate-700/40 rounded-lg" />
              {/* Category badge */}
              <div className="h-5 w-24 bg-cyan-500/20 rounded-full" />
              {/* Title */}
              <div className="h-6 w-5/6 bg-slate-700/50 rounded" />
              {/* Excerpt */}
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              {/* Author row */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-8 w-8 bg-slate-700/50 rounded-full" />
                <div className="h-4 w-28 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Blog post cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              {/* Category badge */}
              <div className="h-5 w-20 bg-cyan-500/20 rounded-full" />
              {/* Title */}
              <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
              {/* Excerpt */}
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              {/* Author row */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-6 w-6 bg-slate-700/50 rounded-full" />
                <div className="h-3 w-24 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
