export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex gap-8">
          {/* Sidebar nav */}
          <div className="hidden lg:block w-56 shrink-0 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-800/40 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
            ))}
          </div>
          {/* Main content */}
          <div className="flex-1 space-y-6 animate-pulse">
            <div className="h-8 w-64 bg-slate-800 rounded" />
            <div className="h-4 w-full bg-slate-800/60 rounded" />
            <div className="h-4 w-5/6 bg-slate-800/40 rounded" />
            <div className="h-40 w-full bg-slate-800/30 rounded-lg" />
            <div className="h-4 w-full bg-slate-800/40 rounded" />
            <div className="h-4 w-3/4 bg-slate-800/40 rounded" />
            <div className="h-32 w-full bg-slate-800/30 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
