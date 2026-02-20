export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* 2-col layout: info panel + calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Info panel */}
          <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
            <div className="h-6 w-48 bg-slate-700/50 rounded" />
            <div className="h-4 w-full bg-slate-700/30 rounded" />
            <div className="h-4 w-full bg-slate-700/30 rounded" />
            <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
            <div className="border-t border-slate-700/30 pt-4 space-y-3">
              <div className="h-5 w-40 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-5/6 bg-slate-700/30 rounded" />
            </div>
            <div className="border-t border-slate-700/30 pt-4 space-y-3">
              <div className="h-5 w-36 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
            </div>
          </div>

          {/* Calculator panel */}
          <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
            <div className="h-6 w-44 bg-slate-700/50 rounded" />
            <div className="space-y-3">
              <div className="h-4 w-28 bg-slate-700/40 rounded" />
              <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-32 bg-slate-700/40 rounded" />
              <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-24 bg-slate-700/40 rounded" />
              <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-36 bg-slate-700/40 rounded" />
              <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
            </div>
            <div className="h-12 w-full bg-blue-700/30 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
