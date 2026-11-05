import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

const SKELETON_ROW_KEYS = ['skeleton-1', 'skeleton-2', 'skeleton-3'] as const;

// WarehouseContent 와 같은 배치로 그려 불러온 뒤 화면이 튀지 않게 한다
export function WarehouseSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">창고를 불러오는 중이에요</span>
      <Card aria-hidden>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[76px] rounded-lg" />
            <Skeleton className="h-[76px] rounded-lg" />
          </div>
        </CardContent>
      </Card>
      <Card aria-hidden>
        <CardHeader>
          <Skeleton className="h-6 w-20" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {SKELETON_ROW_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
