import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon, FishIcon } from 'lucide-react';
import { Link } from 'react-router';
import { fishingQueries, formatFish } from '@/entities/fishing';
import { tutorialTarget } from '@/features/welcome-tutorial';
import { cn } from '@/shared/lib/utils';

type Props = {
  className?: string;
};

// 홈 왼쪽 위 창고 칩: 창고에 모은 물고기. 누르면 창고 화면으로 간다
export function WarehouseChip({ className }: Props) {
  const { data: status } = useQuery(fishingQueries.me());
  if (!status) return null;

  return (
    <Link
      to="/warehouse"
      aria-label={`내 창고 ${formatFish(status.warehouseFish)}마리, 창고 보기`}
      className={cn(
        'flex h-11 items-center gap-1.5 rounded-full bg-card/90 pr-2.5 pl-3 text-base font-bold shadow-[0_2px_10px_rgb(30_70_120/0.14)] outline-none tabular-nums focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
      {...tutorialTarget('warehouse')}
    >
      <FishIcon aria-hidden="true" className="size-5 text-primary" />
      {formatFish(status.warehouseFish)}
      <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
    </Link>
  );
}
