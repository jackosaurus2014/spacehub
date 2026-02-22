export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-8 w-40 bg-slate-800 rounded animate-pulse mb-3" />
        </div>

        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          {/* Sidebar - conversation list */}
          <div className="w-80 shrink-0 space-y-2">
            <div className="h-10 w-full bg-slate-800/50 rounded-lg animate-pulse mb-3" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700/50 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-slate-700/50 rounded" />
                  <div className="h-3 w-40 bg-slate-700/30 rounded" />
                </div>
                <div className="h-3 w-10 bg-slate-700/30 rounded" />
              </div>
            ))}
          </div>

          {/* Message area */}
          <div className="flex-1 bg-slate-800/20 rounded-xl animate-pulse p-6 flex flex-col">
            {/* Message header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800/40 mb-4">
              <div className="h-10 w-10 bg-slate-700/50 rounded-full" />
              <div className="h-5 w-36 bg-slate-700/50 rounded" />
            </div>

            {/* Messages placeholder */}
            <div className="flex-1 space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 bg-slate-700/40 rounded-full shrink-0" />
                <div className="h-16 w-64 bg-slate-700/20 rounded-xl" />
              </div>
              <div className="flex gap-3 justify-end">
                <div className="h-12 w-48 bg-slate-700/20 rounded-xl" />
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 bg-slate-700/40 rounded-full shrink-0" />
                <div className="h-20 w-72 bg-slate-700/20 rounded-xl" />
              </div>
            </div>

            {/* Input area */}
            <div className="h-12 w-full bg-slate-700/30 rounded-xl mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
