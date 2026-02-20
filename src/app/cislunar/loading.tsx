export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Large data panel */}
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
              <div className="h-6 w-48 bg-slate-700/50 rounded" />
              <div className="h-64 w-full bg-slate-700/30 rounded-lg" />
            </div>
            {/* Secondary data panel */}
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
              <div className="h-6 w-40 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-5/6 bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
            </div>
            {/* Tertiary data panel */}
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
              <div className="h-6 w-36 bg-slate-700/50 rounded" />
              <div className="h-40 w-full bg-slate-700/30 rounded-lg" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
                <div className="h-5 w-32 bg-slate-700/50 rounded" />
                <div className="h-4 w-full bg-slate-700/30 rounded" />
                <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
                <div className="h-4 w-5/6 bg-slate-700/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
