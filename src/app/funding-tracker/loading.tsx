export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Timeline skeleton */}
        <div className="bg-slate-800/40 rounded-xl p-6 mb-8 animate-pulse">
          <div className="h-6 w-40 bg-slate-700/50 rounded mb-6" />
          <div className="relative">
            <div className="h-1 w-full bg-slate-700/50 rounded mb-8" />
            <div className="grid grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-16 bg-slate-700/50 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Deal cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-6 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-6 w-48 bg-slate-700/50 rounded" />
                <div className="h-6 w-24 bg-slate-700/50 rounded" />
              </div>
              <div className="h-4 w-full bg-slate-700/50 rounded mb-2" />
              <div className="h-4 w-2/3 bg-slate-700/50 rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-slate-700/50 rounded" />
                <div className="h-8 w-24 bg-slate-700/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
