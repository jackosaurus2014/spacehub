import GridSkeleton from '@/components/ui/GridSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Category grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/40 rounded-xl animate-pulse flex flex-col items-center justify-center gap-2 p-3">
              <div className="h-8 w-8 bg-slate-700/50 rounded-lg" />
              <div className="h-3 w-16 bg-slate-700/40 rounded" />
            </div>
          ))}
        </div>

        {/* Listing cards */}
        <GridSkeleton count={6} cols={3} />
      </div>
    </div>
  );
}
