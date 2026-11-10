import { type FishingStatus, hammockName } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdExpandHammock } from '../api/use-fishing-ad-boosts';
import { formatCooldown } from '../lib/format-cooldown';
import { useCooldown } from '../lib/use-cooldown';
import { BOOST_BUTTON_CLASS, BoostCard } from './boost-card';

type Props = {
  status: FishingStatus;
  receivedAt: number;
  ad: RewardedAd;
};

// 쿨타임마다 광고를 보고 해먹을 정해진 순서로 한 단계 넓힌다 (랜덤 없음). 오늘 자정까지 유지된다.
// 효과에는 다음에 넓어질 해먹 이름을 보여준다 (최대 단계면 지금 해먹).
export function AdExpandHammockCard({ status, receivedAt, ad }: Props) {
  const { mutate, isPending } = useAdExpandHammock();
  const remainingMs = useCooldown(status.adHammockExpandAvailableAt, status.serverTime, receivedAt);
  const isMaxLevel = status.hammockLevel >= status.hammockMaxLevel;
  const nextLevel = isMaxLevel ? status.hammockLevel : status.hammockLevel + 1;
  const bonus = `+${status.adHammockBonusPercent}%`;

  const action =
    isMaxLevel || remainingMs > 0 ? (
      <Button type="button" variant="outline" size="lg" className={BOOST_BUTTON_CLASS} disabled>
        {isMaxLevel ? '오늘 최대' : `${formatCooldown(remainingMs)} 뒤 가능`}
      </Button>
    ) : (
      <RewardedAdButton
        ad={ad}
        label="광고 보고 넓히기"
        accessibleLabel={`광고 보고 ${hammockName(nextLevel)}으로 넓히기 (${bonus})`}
        incompleteMessage="광고를 끝까지 보면 해먹을 넓힐 수 있어요"
        variant="secondary"
        compact
        pendingLabel="넓히는 중"
        isPending={isPending}
        onReward={() => mutate()}
      />
    );

  return (
    <BoostCard
      title="해먹 넓히기"
      value={bonus}
      caption={isMaxLevel ? hammockName(nextLevel) : `${hammockName(nextLevel)} 용량`}
      action={action}
    />
  );
}
