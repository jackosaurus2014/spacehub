export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-72 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Chat messages skeleton */}
        <div className="space-y-4 mb-6">
          {/* AI greeting bubble */}
          <div className="flex gap-3">
            <div className="h-8 w-8 bg-purple-500/20 rounded-full shrink-0" />
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-4 max-w-lg space-y-2">
              <div className="h-4 w-64 bg-slate-700/50 rounded" />
              <div className="h-4 w-48 bg-slate-700/30 rounded" />
            </div>
          </div>

          {/* User message placeholder */}
          <div className="flex gap-3 justify-end">
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-4 max-w-md space-y-2">
              <div className="h-4 w-52 bg-slate-700/40 rounded" />
            </div>
            <div className="h-8 w-8 bg-slate-700/50 rounded-full shrink-0" />
          </div>

          {/* AI response placeholder */}
          <div className="flex gap-3">
            <div className="h-8 w-8 bg-purple-500/20 rounded-full shrink-0" />
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-4 max-w-lg space-y-2">
              <div className="h-4 w-72 bg-slate-700/50 rounded" />
              <div className="h-4 w-56 bg-slate-700/30 rounded" />
              <div className="h-4 w-40 bg-slate-700/30 rounded" />
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="h-12 w-full bg-slate-800/50 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
