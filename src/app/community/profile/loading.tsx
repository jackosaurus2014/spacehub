export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Profile header */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 mb-6 flex items-center gap-5">
          <div className="h-20 w-20 bg-slate-700/50 rounded-full shrink-0" />
          <div className="space-y-3 flex-1">
            <div className="h-6 w-48 bg-slate-700/50 rounded" />
            <div className="h-4 w-32 bg-slate-700/30 rounded" />
            <div className="flex gap-4">
              <div className="h-3 w-20 bg-slate-700/20 rounded" />
              <div className="h-3 w-20 bg-slate-700/20 rounded" />
            </div>
          </div>
        </div>
        {/* Bio */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 mb-6 space-y-3">
          <div className="h-5 w-20 bg-slate-700/40 rounded" />
          <div className="h-4 w-full bg-slate-700/30 rounded" />
          <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
        </div>
        {/* Activity feed */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
          <div className="h-5 w-32 bg-slate-700/40 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-700/20 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
