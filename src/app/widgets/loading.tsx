export default function Loading() {
  return (
    <div className="p-4">
      <div className="max-w-sm mx-auto">
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-4 space-y-3" style={{ height: 200 }}>
          {/* Widget header */}
          <div className="h-5 w-32 bg-slate-700/50 rounded" />
          {/* Widget content */}
          <div className="h-16 w-full bg-slate-700/30 rounded-lg" />
          {/* Widget footer */}
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-slate-700/30 rounded" />
            <div className="h-3 w-16 bg-slate-700/30 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
