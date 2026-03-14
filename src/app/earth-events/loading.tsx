import { SkeletonPage } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <SkeletonPage
      statCards={4}
      contentCards={6}
      statGridCols="grid-cols-2 md:grid-cols-4"
      contentGridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    />
  );
}
