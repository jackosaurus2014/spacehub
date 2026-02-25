export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-52 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse" />
        </div>
        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-slate-700/50 rounded" />
                <div className="h-5 w-16 bg-amber-500/20 rounded-full" />
              </div>
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              <div className="flex gap-4 pt-2">
                <div className="h-3 w-20 bg-slate-700/20 rounded" />
                <div className="h-3 w-20 bg-slate-700/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
