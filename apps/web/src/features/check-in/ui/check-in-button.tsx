import { CheckIcon } from 'lucide-react';
import { type AttendanceStatus, formatReward } from '@/entities/attendance';
import { Button } from '@/shared/ui/button';
import { useCheckIn } from '../api/use-check-in';

type Props = {
  status: Pick<AttendanceStatus, 'checkedToday' | 'nextReward'>;
};

export function CheckInButton({ status }: Props) {
  const { mutate, isPending } = useCheckIn();
  const { checkedToday, nextReward } = status;

  // 출석한 날은 누를 수 없는 버튼 대신 완료 상태만 보여준다
  if (checkedToday) {
    return (
      <p className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-secondary text-base font-semibold text-secondary-foreground">
        <CheckIcon aria-hidden="true" className="size-5" />
        출석 완료
      </p>
    );
  }

  const label =
    nextReward.type === 'OTTER_FRIEND'
      ? '출석하고 해달 친구 부르기'
      : `출석하고 ${formatReward(nextReward)}하기`;

  return (
    <Button
      type="button"
      size="lg"
      className="h-12 w-full text-base"
      // isPending 동안 비활성화해 더블 탭 방어 (서버 유니크 제약이 최종 방어선)
      disabled={isPending}
      onClick={() => mutate()}
    >
      {isPending ? '출석 중...' : label}
    </Button>
  );
}
