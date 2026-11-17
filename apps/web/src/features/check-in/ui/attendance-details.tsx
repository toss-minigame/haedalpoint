import {
  type AttendanceReward,
  AttendanceStamps,
  type AttendanceStatus,
  formatReward,
} from '@/entities/attendance';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useCheckIn } from '../api/use-check-in';
import { attendanceWeek, nextAttendanceDay } from '../lib/attendance-week';

const BUTTON_CLASS = 'h-14 w-full rounded-2xl text-base';

type Props = {
  status: AttendanceStatus;
  ad: RewardedAd;
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

/** 윗줄: 몇 번째 출석인지 (출석은 연속이 아니라 누적으로 센다) */
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

function CheckInAction({ status, ad }: Props) {
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

// 출석 현황 (Figma attendance-card 본문): 몇 번째 출석인지, 이번 7일 묶음의 출석 칸, 지급 중인 토스 포인트, 출석 버튼.
// 보상은 누적 출석 일차로 정해진다: 1~6일차 토스 포인트, 7일차 해달 친구, 8일차부터 낚싯대 강화
export function AttendanceDetails({ status, ad }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold break-keep">
        <Headline status={status} />
      </p>
      <AttendanceStamps stamps={attendanceWeek(status)} nextDay={nextAttendanceDay(status)} />
      {status.pendingTossPoints > 0 && (
        <p className="text-[15px] break-keep text-muted-foreground">
          지급 중인 토스 포인트 {status.pendingTossPoints}원
        </p>
      )}
      <CheckInAction status={status} ad={ad} />
    </div>
  );
}
