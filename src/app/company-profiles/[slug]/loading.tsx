export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="h-4 w-40 bg-slate-800/40 rounded animate-pulse mb-6" />

        {/* Company hero */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 mb-8">
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 bg-slate-700/50 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-7 w-64 bg-slate-700/50 rounded" />
              <div className="h-4 w-48 bg-slate-700/30 rounded" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-24 bg-slate-700/40 rounded-full" />
                <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Tab content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-40 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
