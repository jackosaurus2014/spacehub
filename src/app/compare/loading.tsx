export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-72 bg-slate-800/60 rounded animate-pulse" />
        </div>
        {/* Selection row */}
        <div className="flex gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-48 bg-slate-800/40 rounded-lg animate-pulse" />
          ))}
        </div>
        {/* Comparison table */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
          <div className="h-6 w-full bg-slate-700/30 rounded" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-slate-700/20 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
