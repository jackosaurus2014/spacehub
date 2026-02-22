export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-4 space-y-2">
              <div className="h-8 w-16 bg-slate-700/50 rounded" />
              <div className="h-3 w-20 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Forum category cards */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 flex items-center gap-4">
              <div className="h-12 w-12 bg-slate-700/50 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-slate-700/50 rounded" />
                <div className="h-3 w-72 bg-slate-700/30 rounded" />
              </div>
              <div className="hidden md:flex gap-6">
                <div className="h-4 w-16 bg-slate-700/30 rounded" />
                <div className="h-4 w-16 bg-slate-700/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
