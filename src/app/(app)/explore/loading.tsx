import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/shared/states';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-7">
      <PageHeaderSkeleton />
      <Skeleton className="h-10 w-full rounded-lg" />
      <CardGridSkeleton count={6} />
    </div>
  );
}
