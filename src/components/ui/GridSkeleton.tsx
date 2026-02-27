import CardSkeleton from './CardSkeleton';

export default function GridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  const colsClass =
    cols === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : cols === 4
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${colsClass} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
