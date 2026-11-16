import { CheckIcon } from 'lucide-react';
import { type AttendanceStatus, formatReward } from '@/entities/attendance';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useCheckIn } from '../api/use-check-in';

type Props = {
  status: Pick<AttendanceStatus, 'checkedToday' | 'nextReward'>;
  ad: RewardedAd;
};

// 출석은 보상형 광고를 끝까지 봤을 때(`userEarnedReward`)만 기록한다.
// 광고를 볼 수 없으면 출석하지 않고, 버튼 문구와 안내로 이유와 다음 행동을 알려준다.
export function CheckInButton({ status, ad }: Props) {
  const { mutate, isPending } = useCheckIn();
  const { checkedToday, nextReward } = status;
  const reward = formatReward(nextReward);

  return (
    <div className="flex flex-col gap-2">
      {/* 출석했으면 nextReward 는 내일 출석 보상이다 */}
      <p className="flex items-center justify-between gap-3 text-[15px]">
        <span className="text-muted-foreground">
          {checkedToday ? '내일 출석 보상' : '오늘 출석 보상'}
        </span>
        <strong className="font-semibold">{reward}</strong>
      </p>
      {/* 출석한 날은 누를 수 없는 버튼 대신 완료 상태만 보여준다 */}
      {checkedToday ? (
        <p className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-secondary text-base font-semibold text-secondary-foreground">
          <CheckIcon aria-hidden="true" className="size-5" />
          출석 완료
        </p>
      ) : (
        <>
          <RewardedAdButton
            ad={ad}
            label="광고 보고 출석하기"
            accessibleLabel={`광고 보고 출석하고 ${reward} 받기`}
            incompleteMessage="광고를 끝까지 보면 출석할 수 있어요"
            variant="default"
            pendingLabel="출석하고 있어요"
            isPending={isPending}
            onReward={() => mutate()}
          />
          {ad.status === 'unsupported' && (
            <p className="text-[15px] break-keep text-muted-foreground">
              광고를 볼 수 없어 출석할 수 없어요. 토스 앱을 최신 버전으로 업데이트해 주세요.
            </p>
          )}
        </>
      )}
    </div>
  );
}
