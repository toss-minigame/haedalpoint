import { useQuery } from '@tanstack/react-query';
import { fishingQueries } from '@/entities/fishing';
import { rouletteQueries } from '@/entities/roulette';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { GiftIcon } from '@/shared/ui/reward-icons';
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
import { todayBoostRows, todaySpeedBonusPercent } from '../lib/today-boost-rows';

type Props = {
  className?: string;
};

// 오늘의 강화: 홈 오른쪽 위 칩. 누르면 아래에서 지금 적용 중인 강화 목록이 올라온다.
// 해달 낚시 카드와 같은 현황(fishingQueries.me)을 함께 쓰고, 현황이 없으면 그리지 않는다.
// 눈사람 친구만 자정이 아니라 온 지 24시간 뒤(otterFriendUntil. 얼리면 더 늦다)에 떠난다.
export function TodayBoost({ className }: Props) {
  const { data: status, dataUpdatedAt } = useQuery(fishingQueries.me());
  // 미끼 이름은 낚시 현황에 없어서, 오늘 미끼를 단 경우에만 룰렛 정보를 받는다
  const hasBait = (status?.baitSpeedBonusPercent ?? 0) > 0;
  const { data: roulette } = useQuery({ ...rouletteQueries.today(), enabled: hasBait });
  if (!status) return null;

  const baitName = roulette?.spin?.appliedAt ? roulette.spin.fishName : null;

  const speedBonus = `+${todaySpeedBonusPercent(status)}%`;
  // 서버 시각 기준 지금 (응답을 받은 뒤 지난 시간만큼 더한다)
  const now = new Date(Date.parse(status.serverTime) + Date.now() - dataUpdatedAt);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`오늘의 강화 ${speedBonus}, 강화 목록 보기`}
          className={cn(
            // 좁은 화면에서도 "오늘의 강화"가 두 줄로 깨지지 않게 한 줄로 둔다
            'flex h-11 items-center gap-1.5 rounded-full bg-card/90 px-3 whitespace-nowrap text-[15px] font-semibold text-foreground shadow-[0_2px_10px_rgb(30_70_120/0.14)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            className,
          )}
        >
          <GiftIcon className="size-5 shrink-0" />
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
            낚싯대·미끼·양동이는 오늘 자정까지, 눈사람 친구는 온 때부터 24시간, 얼리면{' '}
            {status.otterFriendFreezeHours}시간 더 함께해요.
          </SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col px-6">
          {todayBoostRows(status, baitName, now).map((row) => (
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
