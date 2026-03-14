import GridSkeleton from '@/components/ui/GridSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-4 w-48 bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-8 w-80 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-[32rem] max-w-full bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-2xl p-6 text-center animate-pulse">
              <div className="h-8 w-16 mx-auto bg-slate-700/60 rounded mb-2" />
              <div className="h-3 w-24 mx-auto bg-slate-700/40 rounded" />
            </div>
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="bg-white/[0.04] rounded-2xl p-4 mb-8 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-700/50 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Conference event cards */}
        <GridSkeleton count={6} cols={3} />
      </div>
    </div>
  );
}
