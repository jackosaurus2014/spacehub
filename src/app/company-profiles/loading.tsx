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

        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 w-full max-w-xl bg-slate-800/50 rounded-xl animate-pulse" />
        </div>

        {/* Company profile cards */}
        <GridSkeleton count={9} cols={3} />
      </div>
    </div>
  );
}
