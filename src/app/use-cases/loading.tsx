import { SkeletonPage } from '@/components/ui/Skeleton';

export default function Loading() {
  return <SkeletonPage statCards={0} contentCards={6} contentGridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />;
}
