import { useQuery } from '@tanstack/react-query';
import {
  type AttendanceReward,
  AttendanceStamps,
  type AttendanceStatus,
  attendanceQueries,
  formatReward,
} from '@/entities/attendance';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { AttendanceIcon } from '@/shared/ui/reward-icons';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useCheckIn } from '../api/use-check-in';

const BUTTON_CLASS = 'h-14 w-full rounded-2xl text-base';

type Props = {
  ad: RewardedAd;
  className?: string;
};

/** 출석 버튼 문구: 광고를 보고 받는 보상 (예: 광고 보고 출석하고 1원 받기) */
function checkInLabel(reward: AttendanceReward): string {
  switch (reward.type) {
    case 'TOSS_POINT':
      return `광고 보고 출석하고 ${reward.amount}원 받기`;
    case 'OTTER_FRIEND':
      return '광고 보고 출석하고 해달 친구 부르기';
    case 'ENHANCE_BONUS':
      return '광고 보고 출석하고 낚싯대 강화하기';
  }
}

/** 카드 윗줄: 몇 번째 출석인지 (출석은 연속이 아니라 누적으로 센다) */
function Headline({ status }: { status: AttendanceStatus }) {
  const days = status.attendanceDays;
  if (days === 0) return <>오늘 첫 출석을 해보세요</>;
  return (
    <>
      <span className="text-primary">{days}일째</span>{' '}
      {status.checkedToday ? '출석 완료!' : '출석 중!'}
    </>
  );
}

function CheckInAction({ status, ad }: { status: AttendanceStatus; ad: RewardedAd }) {
  const { mutate, isPending } = useCheckIn();
  if (status.checkedToday) {
    return (
      <Button type="button" variant="secondary" size="lg" className={BUTTON_CLASS} disabled>
        내일 출석하면 {formatReward(status.nextReward)}
      </Button>
    );
  }
  return (
    <RewardedAdButton
      ad={ad}
      label={checkInLabel(status.nextReward)}
      incompleteMessage="광고를 끝까지 보면 출석할 수 있어요"
      variant="default"
      className={BUTTON_CLASS}
      pendingLabel="출석하고 있어요"
      isPending={isPending}
      onReward={() => mutate()}
    />
  );
}

// 홈 출석체크 카드 (Figma attendance-card). 첫 주는 1~7일차 현황을, 그 뒤에는 매일 받는 보상을 보여준다.
// 보상은 누적 출석 일차로 정해진다: 1~6일차 토스 포인트, 7일차 해달 친구, 8일차부터 낚싯대 강화
export function CheckInCard({ ad, className }: Props) {
  const { data: status, isPending, isError, error } = useQuery(attendanceQueries.me());
  const nextDay =
    status && !status.firstWeekCompleted && !status.checkedToday ? status.attendanceDays + 1 : null;

  return (
    <section aria-labelledby="attendance-heading" className={className}>
      <div className="flex items-center gap-2 border-b pb-3">
        <span className="grid size-8 place-items-center rounded-lg bg-secondary">
          <AttendanceIcon className="size-6" />
        </span>
        <h2 id="attendance-heading" className="text-lg font-bold">
          출석체크
        </h2>
      </div>
      <div className="flex flex-col gap-4 pt-4">
        {isPending && (
          <p className="text-[15px] text-muted-foreground">출석 현황을 불러오고 있어요</p>
        )}
        {isError && <p className="text-[15px] text-destructive">{error.message}</p>}
        {status && (
          <>
            <p className="text-lg font-semibold break-keep">
              <Headline status={status} />
            </p>
            {status.firstWeekCompleted ? (
              <p className="text-[15px] break-keep text-muted-foreground">
                매일 출석하면 그날 {formatReward(status.nextReward)}돼요
              </p>
            ) : (
              <AttendanceStamps firstWeek={status.firstWeek} nextDay={nextDay} />
            )}
            {status.pendingTossPoints > 0 && (
              <p className="text-[15px] break-keep text-muted-foreground">
                지급 중인 토스 포인트 {status.pendingTossPoints}원
              </p>
            )}
            <CheckInAction status={status} ad={ad} />
          </>
        )}
      </div>
    </section>
  );
}
