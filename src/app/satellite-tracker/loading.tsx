import { SkeletonPage } from '@/components/ui/Skeleton';

export default function Loading() {
  return <SkeletonPage statCards={3} contentCards={1} statGridCols="grid-cols-1 md:grid-cols-3" contentGridCols="grid-cols-1" />;
}
