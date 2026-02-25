export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-44 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-64 bg-slate-800/60 rounded animate-pulse" />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-4 w-24 bg-slate-700/40 rounded" />
              <div className="h-8 w-16 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>
        {/* Table rows */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
          <div className="h-5 w-full bg-slate-700/30 rounded" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-slate-700/20 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
