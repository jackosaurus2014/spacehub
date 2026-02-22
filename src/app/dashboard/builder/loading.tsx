export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-52 bg-slate-800 rounded animate-pulse mb-3" />
            <div className="h-4 w-72 bg-slate-800/60 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-slate-800/50 rounded-lg animate-pulse" />
            <div className="h-10 w-28 bg-blue-500/20 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Dashboard widget grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3 ${
                i === 0 ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-36 bg-slate-700/50 rounded" />
                <div className="h-5 w-5 bg-slate-700/30 rounded" />
              </div>
              <div className="h-32 w-full bg-slate-700/20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
