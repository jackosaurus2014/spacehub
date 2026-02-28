import { SkeletonPage } from '@/components/ui/Skeleton';

export default function Loading() {
  return <SkeletonPage statCards={4} contentCards={3} />;
}
