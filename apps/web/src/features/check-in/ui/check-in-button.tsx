import { type AttendanceStatus, formatReward } from '@/entities/attendance';
import { Button } from '@/shared/ui/button';
import { useCheckIn } from '../api/use-check-in';

type Props = {
  status: Pick<AttendanceStatus, 'checkedToday' | 'nextStreakDay' | 'nextReward'>;
};

export function CheckInButton({ status }: Props) {
  const { mutate, isPending } = useCheckIn();
  const { checkedToday, nextStreakDay, nextReward } = status;

  const label = checkedToday
    ? '출석 완료'
    : `출석하기 (${nextStreakDay}일차 · ${formatReward(nextReward)})`;

  return (
    <Button
      type="button"
      size="lg"
      className="h-12 w-full text-base"
      // isPending 동안 비활성화해 더블 탭 방어 (서버 유니크 제약이 최종 방어선)
      disabled={checkedToday || isPending}
      onClick={() => mutate()}
    >
      {isPending ? '출석 중...' : label}
    </Button>
  );
}
