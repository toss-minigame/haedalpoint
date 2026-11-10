import { useQuery } from '@tanstack/react-query';
import { fishingQueries } from '@/entities/fishing';
import { rouletteQueries } from '@/entities/roulette';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
import { ShellIcon } from '@/shared/ui/shell-icon';
import { todayBoostRows, todaySpeedBonusPercent } from '../lib/today-boost-rows';

type Props = {
  className?: string;
};

// 오늘의 강화: 해달 장면 왼쪽 위에 겹치는 작은 조개 표시. 누르면 아래에서 지금 적용 중인 강화 목록이 올라온다.
// 장면을 가리지 않도록 바탕 없이 글자와 아이콘만 그린다.
// 해달 낚시 카드와 같은 현황(fishingQueries.me)을 함께 쓰고, 현황이 없으면 그리지 않는다.
export function TodayBoost({ className }: Props) {
  const { data: status } = useQuery(fishingQueries.me());
  // 미끼 이름은 낚시 현황에 없어서, 오늘 미끼를 단 경우에만 룰렛 정보를 받는다
  const hasBait = (status?.baitSpeedBonusPercent ?? 0) > 0;
  const { data: roulette } = useQuery({ ...rouletteQueries.today(), enabled: hasBait });
  if (!status) return null;

  const baitName = roulette?.spin?.appliedAt ? roulette.spin.fishName : null;

  const speedBonus = `+${todaySpeedBonusPercent(status)}%`;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`오늘의 강화 ${speedBonus}, 강화 목록 보기`}
          className={cn(
            // 보이는 크기는 작게, 누르는 영역은 44px 을 유지한다
            'flex h-11 items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-foreground outline-none [text-shadow:0_0_6px_rgb(255_255_255/0.9)] focus-visible:ring-3 focus-visible:ring-ring/50',
            className,
          )}
        >
          <ShellIcon className="size-5 shrink-0" />
          오늘의 강화
          <span className="text-primary tabular-nums">{speedBonus}</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-xl gap-0 rounded-t-3xl border-0 pb-[max(2.125rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="gap-1 px-6 pt-6 pb-2">
          <SheetTitle className="text-xl font-bold">
            오늘의 강화 <span className="text-primary tabular-nums">{speedBonus}</span>
          </SheetTitle>
          <SheetDescription className="text-[15px] break-keep">
            오늘 자정까지 적용되는 강화예요. 자정이 지나면 모두 초기화돼요.
          </SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col px-6">
          {todayBoostRows(status, baitName).map((row) => (
            <li
              key={row.key}
              className={cn(
                'flex items-center justify-between gap-4 border-b py-4 last:border-b-0',
                !row.isActive && 'text-muted-foreground',
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base font-semibold">{row.title}</span>
                <span className="text-[13px] text-muted-foreground">{row.detail}</span>
              </div>
              <span
                className={cn(
                  'shrink-0 text-base font-bold tabular-nums',
                  row.isActive && 'text-primary',
                )}
              >
                {row.value}
              </span>
            </li>
          ))}
        </ul>
        <SheetFooter className="px-6 pt-4 pb-0">
          <SheetClose asChild>
            <Button type="button" variant="outline" size="lg" className="h-12 w-full text-base">
              닫기
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
