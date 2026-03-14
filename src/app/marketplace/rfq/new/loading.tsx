export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8">
          <div className="h-8 w-56 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>
        {/* Form skeleton */}
        <div className="bg-white/[0.04] rounded-xl animate-pulse p-6 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-slate-700/40 rounded" />
              <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
            </div>
          ))}
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-700/40 rounded" />
            <div className="h-32 w-full bg-slate-700/20 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-slate-700/40 rounded" />
              <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-700/40 rounded" />
              <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
            </div>
          </div>
          <div className="h-11 w-full bg-white/10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
