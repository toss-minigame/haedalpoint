import type { FishingStatus } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdExpandHammock } from '../api/use-fishing-ad-boosts';

type Props = {
  status: FishingStatus;
  ad: RewardedAd;
};

// 하루 한 번 광고를 보고 해먹을 넓힌다. 넓힌 용량은 오늘 자정까지 유지된다.
export function AdExpandHammockButton({ status, ad }: Props) {
  const { mutate, isPending } = useAdExpandHammock();

  if (status.hammockExpanded) {
    return (
      <Button type="button" variant="outline" size="lg" className="h-12 w-full text-base" disabled>
        오늘은 해먹을 넓혔어요
      </Button>
    );
  }

  return (
    <RewardedAdButton
      ad={ad}
      label={`광고 보고 해먹 넓히기 (+${status.hammockExpandBonusPercent}%)`}
      incompleteMessage="광고를 끝까지 보면 해먹을 넓힐 수 있어요"
      variant="outline"
      isPending={isPending}
      onReward={() => mutate()}
    />
  );
}
