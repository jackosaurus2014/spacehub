export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[500px] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Overview stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5">
              <div className="h-4 w-24 bg-slate-700/50 rounded mb-2" />
              <div className="h-8 w-20 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Category tabs skeleton */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>

        {/* Role cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-48 bg-slate-700/50 rounded" />
                <div className="h-5 w-16 bg-slate-700/40 rounded-full" />
              </div>
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-3 bg-slate-700/20 rounded-full" />
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-slate-700/30 rounded" />
                <div className="h-3 w-20 bg-slate-700/30 rounded" />
                <div className="h-3 w-16 bg-slate-700/30 rounded" />
              </div>
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-14 bg-slate-700/40 rounded-full" />
                <div className="h-5 w-18 bg-slate-700/40 rounded-full" />
                <div className="h-5 w-12 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
