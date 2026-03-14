import GridSkeleton from '@/components/ui/GridSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 flex-1 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* News article cards */}
        <GridSkeleton count={6} cols={3} />
      </div>
    </div>
  );
}
