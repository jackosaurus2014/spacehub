export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mb-4" />
          <div className="h-8 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Market overview stat cards (3-col) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-2xl animate-pulse p-6 space-y-3"
            >
              <div className="h-4 w-24 bg-slate-700/50 rounded" />
              <div className="h-8 w-32 bg-slate-700/30 rounded" />
              <div className="h-3 w-full bg-slate-700/20 rounded" />
            </div>
          ))}
        </div>

        {/* Company cards (2-col) */}
        <div className="mb-4">
          <div className="h-6 w-44 bg-slate-800 rounded animate-pulse mb-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-2xl animate-pulse p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700/50 rounded-full" />
                <div className="h-5 w-40 bg-slate-700/50 rounded" />
              </div>
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Table placeholder */}
        <div className="bg-slate-800/40 rounded-2xl animate-pulse p-6 mb-8">
          <div className="h-5 w-56 bg-slate-700/50 rounded mb-4" />
          <div className="h-64 w-full bg-slate-700/20 rounded-lg" />
        </div>

        {/* Challenges / Use cases (2-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/40 rounded-2xl animate-pulse p-5 space-y-3"
            >
              <div className="h-5 w-40 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              <div className="h-4 w-1/2 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
