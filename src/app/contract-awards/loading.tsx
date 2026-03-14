export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-56 bg-white/[0.06] rounded mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-4 mb-8 animate-pulse">
          <div className="h-10 flex-1 bg-white/[0.04] rounded-lg" />
          <div className="h-10 w-36 bg-white/[0.04] rounded-lg" />
          <div className="h-10 w-36 bg-white/[0.04] rounded-lg" />
        </div>

        {/* Table skeleton */}
        <div className="bg-white/[0.03] rounded-xl overflow-hidden animate-pulse">
          {/* Table header */}
          <div className="flex gap-4 p-4 border-b border-white/[0.06]">
            <div className="h-4 w-1/4 bg-slate-700/50 rounded" />
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
            <div className="h-4 w-24 bg-slate-700/50 rounded" />
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
            <div className="h-4 w-24 bg-slate-700/50 rounded" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-white/[0.03]">
              <div className="h-4 w-1/4 bg-slate-700/20 rounded" />
              <div className="h-4 w-16 bg-slate-700/20 rounded" />
              <div className="h-4 w-24 bg-slate-700/20 rounded" />
              <div className="h-4 w-20 bg-slate-700/20 rounded" />
              <div className="h-4 w-20 bg-slate-700/20 rounded" />
              <div className="h-4 w-24 bg-slate-700/20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
