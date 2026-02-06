export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-700/50 ${className}`}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card-elevated p-6 text-center">
      <Skeleton className="h-4 w-20 mx-auto mb-2" />
      <Skeleton className="h-8 w-16 mx-auto" />
    </div>
  );
}

export function SkeletonNewsCard() {
  return (
    <div className="card p-6">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function SkeletonContentCard() {
  return (
    <div className="card p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function SkeletonPage({
  statCards = 4,
  contentCards = 3,
  statGridCols = 'grid-cols-2 md:grid-cols-4',
  contentGridCols = 'grid-cols-1 lg:grid-cols-2',
}: {
  statCards?: number;
  contentCards?: number;
  statGridCols?: string;
  contentGridCols?: string;
}) {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8 pt-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        {/* Stat cards */}
        <div className={`grid ${statGridCols} gap-4 mb-8`}>
          {Array.from({ length: statCards }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Content cards */}
        <div className={`grid ${contentGridCols} gap-6`}>
          {Array.from({ length: contentCards }).map((_, i) => (
            <SkeletonContentCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonNewsGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonNewsCard key={i} />
      ))}
    </div>
  );
}
