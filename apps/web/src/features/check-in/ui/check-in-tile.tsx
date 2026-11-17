import { useQuery } from '@tanstack/react-query';
import { CalendarCheckIcon } from 'lucide-react';
import {
  AttendanceStamps,
  type AttendanceStatus,
  attendanceQueries,
  formatReward,
} from '@/entities/attendance';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { REWARD_TILE_CLASS, RewardTileContent } from '@/shared/ui/reward-tile';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
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
import { useCheckIn } from '../api/use-check-in';

const TITLE = '출석체크';
const ICON = <CalendarCheckIcon />;

type Props = {
  ad: RewardedAd;
};

function descriptionOf(status: AttendanceStatus): string {
  return status.firstWeekCompleted
    ? `${status.attendanceDays}일 출석했어요. 매일 출석하면 그날 낚싯대가 강화돼요`
    : '광고를 보고 출석하면 날마다 보상을 받아요. 7일째에는 해달 친구가 와요';
}

/** 오늘 출석한 뒤에 누르면 올라오는 출석 현황 (첫 주 도장, 내일 보상, 지급 중인 토스 포인트) */
function AttendanceSheet({ status }: { status: AttendanceStatus }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className={REWARD_TILE_CLASS}
          aria-label={`출석 완료, ${status.attendanceDays}일째. 출석 현황 보기`}
        >
          <RewardTileContent
            icon={ICON}
            title={TITLE}
            status={`${status.attendanceDays}일째`}
            isDimmed
          />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-xl gap-0 rounded-t-3xl border-0 pb-[max(2.125rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="gap-1 px-6 pt-6 pb-4">
          <SheetTitle className="text-xl font-bold">출석체크</SheetTitle>
          <SheetDescription className="text-[15px] break-keep">
            {descriptionOf(status)}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6">
          {!status.firstWeekCompleted && <AttendanceStamps firstWeek={status.firstWeek} />}
          <p className="flex items-center justify-between gap-3 text-[15px]">
            <span className="text-muted-foreground">내일 출석 보상</span>
            <strong className="font-semibold">{formatReward(status.nextReward)}</strong>
          </p>
          {status.pendingTossPoints > 0 && (
            <p className="text-[15px] break-keep text-muted-foreground">
              지급 중인 토스 포인트 {status.pendingTossPoints}원
            </p>
          )}
        </div>
        <SheetFooter className="px-6 pt-6 pb-0">
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

// 홈 리워드 아이콘 줄의 출석체크. 오늘 아직 출석하지 않았으면 누르면 바로 광고를 보고 출석한다
// (보상형 광고를 끝까지 봤을 때만 기록). 출석한 뒤에는 누르면 출석 현황이 아래에서 올라온다.
export function CheckInTile({ ad }: Props) {
  const { data: status } = useQuery(attendanceQueries.me());
  const { mutate, isPending } = useCheckIn();

  if (!status) {
    return (
      <Button type="button" variant="ghost" size="lg" className={REWARD_TILE_CLASS} disabled>
        <RewardTileContent icon={ICON} title={TITLE} status="불러오는 중" isDimmed />
      </Button>
    );
  }
  if (status.checkedToday) return <AttendanceSheet status={status} />;

  const reward = formatReward(status.nextReward);
  return (
    <RewardedAdButton
      ad={ad}
      label="광고 보기"
      accessibleLabel={`광고 보고 출석하고 ${reward} 받기`}
      incompleteMessage="광고를 끝까지 보면 출석할 수 있어요"
      variant="ghost"
      compact
      className={REWARD_TILE_CLASS}
      pendingLabel="출석 중"
      isPending={isPending}
      renderLabel={(text, pending) => (
        <RewardTileContent
          icon={ICON}
          title={TITLE}
          status={text}
          hasBadge={ad.status === 'ready'}
          isDimmed={ad.status !== 'ready' && !pending}
          isPending={pending}
        />
      )}
      onReward={() => mutate()}
    />
  );
}
