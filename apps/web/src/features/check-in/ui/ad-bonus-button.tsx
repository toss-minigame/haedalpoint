import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useClaimAdBonus } from '../api/use-claim-ad-bonus';

type Props = {
  ad: RewardedAd;
};

// 출석 기본 보상과는 별개인 선택 행동. 광고를 끝까지 봤을 때만 오늘 보상을 한 번 더 받는다.
export function AdBonusButton({ ad }: Props) {
  const { mutate, isPending } = useClaimAdBonus();

  return (
    <RewardedAdButton
      ad={ad}
      label="광고 보고 보상 한 번 더 받기"
      pendingLabel="보상을 받고 있어요"
      incompleteMessage="광고를 끝까지 보면 보상을 한 번 더 받을 수 있어요"
      variant="outline"
      isPending={isPending}
      onReward={() => mutate()}
    />
  );
}
