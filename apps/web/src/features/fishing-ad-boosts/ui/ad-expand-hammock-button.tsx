import { type FishingStatus, hammockName } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdExpandHammock } from '../api/use-fishing-ad-boosts';
import { formatCooldown } from '../lib/format-cooldown';
import { useCooldown } from '../lib/use-cooldown';

type Props = {
  status: FishingStatus;
  receivedAt: number;
  ad: RewardedAd;
};

// 쿨타임마다 광고를 보고 해먹을 정해진 순서로 한 단계 넓힌다 (랜덤 없음). 오늘 자정까지 유지된다.
export function AdExpandHammockButton({ status, receivedAt, ad }: Props) {
  const { mutate, isPending } = useAdExpandHammock();
  const remainingMs = useCooldown(status.adHammockExpandAvailableAt, status.serverTime, receivedAt);
  const isMaxLevel = status.hammockLevel >= status.hammockMaxLevel;

  // 지금 받을 수 없는 보상이면 광고를 띄우지 않는다
  if (isMaxLevel || remainingMs > 0) {
    return (
      <Button type="button" variant="outline" size="lg" className="h-12 w-full text-base" disabled>
        {isMaxLevel
          ? '오늘은 해먹을 최대로 넓혔어요'
          : `${formatCooldown(remainingMs)} 뒤에 다시 넓힐 수 있어요`}
      </Button>
    );
  }

  return (
    <RewardedAdButton
      ad={ad}
      label={`광고 보고 ${hammockName(status.hammockLevel + 1)}으로 넓히기 (+${status.adHammockBonusPercent}%)`}
      incompleteMessage="광고를 끝까지 보면 해먹을 넓힐 수 있어요"
      variant="outline"
      isPending={isPending}
      onReward={() => mutate()}
    />
  );
}
