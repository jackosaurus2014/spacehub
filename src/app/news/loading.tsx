import GridSkeleton from '@/components/ui/GridSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 flex-1 bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-slate-800/50 rounded-lg animate-pulse" />
        </div>

        {/* News article cards */}
        <GridSkeleton count={6} cols={3} />
      </div>
    </div>
  );
}
