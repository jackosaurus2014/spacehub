import type { CSSProperties } from 'react';

export function Skeleton({ className = '', style, shimmer = true }: { className?: string; style?: CSSProperties; shimmer?: boolean }) {
  return (
    <div
      className={`${shimmer ? 'skeleton-shimmer' : 'animate-pulse bg-white/[0.08]'} rounded ${className}`}
      style={style}
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

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="flex gap-4 p-4 bg-white/[0.04] border-b border-white/[0.06]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-white/[0.06]">
          <Skeleton className="h-4 w-28" />
          <Skeleton className={`h-4 ${i % 2 === 0 ? 'w-36' : 'w-24'}`} />
          <Skeleton className="h-4 w-16" />
          <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-32' : 'w-20'}`} />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card p-6">
      {/* Title */}
      <Skeleton className="h-5 w-48 mb-4" />
      {/* Chart area */}
      <div className="relative h-64 flex items-end gap-2">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-full mr-2">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-6" />
        </div>
        {/* Bar placeholders */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1">
            <Skeleton
              className="w-full rounded-t"
              style={{ height: `${30 + Math.random() * 60}%` } as CSSProperties}
            />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 6 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          {/* Icon placeholder */}
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          {/* Text lines */}
          <div className="flex-1 min-w-0">
            <Skeleton className={`h-4 mb-2 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
            <Skeleton className={`h-3 ${i % 3 === 0 ? 'w-full' : 'w-2/3'}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTabs({ tabs = 4 }: { tabs?: number }) {
  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-10 rounded-lg ${i === 0 ? 'w-28' : i % 2 === 0 ? 'w-24' : 'w-32'}`}
          />
        ))}
      </div>
      {/* Content placeholder below tabs */}
      <div className="card p-6 space-y-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="space-y-6">
      {/* Title area */}
      <div className="text-center">
        <Skeleton className="h-8 w-64 mx-auto mb-3" />
        <Skeleton className="h-4 w-96 max-w-full mx-auto" />
      </div>
      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated p-6 text-center">
            <Skeleton className="h-10 w-20 mx-auto mb-2" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        ))}
      </div>
      {/* Large content card */}
      <div className="card p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}
