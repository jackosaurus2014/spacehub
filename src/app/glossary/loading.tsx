import GridSkeleton from '@/components/ui/GridSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 w-full max-w-lg bg-white/[0.04] rounded-xl animate-pulse" />
        </div>

        {/* Glossary term cards */}
        <GridSkeleton count={8} cols={2} />
      </div>
    </div>
  );
}
