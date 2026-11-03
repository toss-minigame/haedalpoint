import type { FishingStatus } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdEnhanceRod } from '../api/use-fishing-ad-boosts';
import { formatCooldown } from '../lib/format-cooldown';
import { useAdRodCooldown } from '../lib/use-ad-rod-cooldown';

type Props = {
  status: FishingStatus;
  receivedAt: number;
  ad: RewardedAd;
};

// 쿨타임마다 광고를 보고 낚싯대를 한 단계 강화한다. 강화는 오늘 자정까지 유지된다.
export function AdEnhanceRodButton({ status, receivedAt, ad }: Props) {
  const { mutate, isPending } = useAdEnhanceRod();
  const remainingMs = useAdRodCooldown(status, receivedAt);
  const isMaxLevel = status.rodLevel >= status.rodMaxLevel;

  // 지금 받을 수 없는 보상이면 광고를 띄우지 않는다
  if (isMaxLevel || remainingMs > 0) {
    return (
      <Button type="button" variant="outline" size="lg" className="h-12 w-full text-base" disabled>
        {isMaxLevel
          ? '오늘은 낚싯대를 최대로 강화했어요'
          : `${formatCooldown(remainingMs)} 뒤에 다시 강화할 수 있어요`}
      </Button>
    );
  }

  return (
    <RewardedAdButton
      ad={ad}
      label={`광고 보고 낚싯대 강화하기 (+${status.adRodSpeedBonusPercent}%)`}
      incompleteMessage="광고를 끝까지 보면 낚싯대를 강화할 수 있어요"
      variant="outline"
      isPending={isPending}
      onReward={() => mutate()}
    />
  );
}
