export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-80 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-[28rem] max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Agency dashboard cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-4 space-y-2">
              <div className="h-3 w-16 bg-slate-700/40 rounded" />
              <div className="h-7 w-10 bg-slate-700/50 rounded" />
              <div className="h-3 w-24 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Timeline skeleton */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 mb-8">
          <div className="h-5 w-40 bg-slate-700/50 rounded mb-4" />
          <div className="h-32 w-full bg-slate-700/30 rounded" />
        </div>

        {/* Proceedings table */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse overflow-hidden">
          <div className="grid grid-cols-5 gap-4 p-4 border-b border-slate-700/30">
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
            <div className="h-4 w-24 bg-slate-700/50 rounded" />
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 p-4 border-b border-slate-700/10">
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
              <div className="h-4 w-5/6 bg-slate-700/30 rounded" />
              <div className="h-5 w-16 bg-slate-700/20 rounded-full" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
