import { type FishingStatus, hammockName } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdExpandHammock } from '../api/use-fishing-ad-boosts';
import { formatCooldown } from '../lib/format-cooldown';
import { useCooldown } from '../lib/use-cooldown';
import { BOOST_BUTTON_CLASS, BoostButtonLabel } from './boost-button-label';

type Props = {
  status: FishingStatus;
  receivedAt: number;
  ad: RewardedAd;
};

const TITLE = '해먹 넓히기';

// 쿨타임마다 광고를 보고 해먹을 정해진 순서로 한 단계 넓힌다 (랜덤 없음). 오늘 자정까지 유지된다.
export function AdExpandHammockButton({ status, receivedAt, ad }: Props) {
  const { mutate, isPending } = useAdExpandHammock();
  const remainingMs = useCooldown(status.adHammockExpandAvailableAt, status.serverTime, receivedAt);
  const isMaxLevel = status.hammockLevel >= status.hammockMaxLevel;
  const bonus = `+${status.adHammockBonusPercent}%`;

  if (isMaxLevel || remainingMs > 0) {
    return (
      <Button type="button" variant="secondary" size="lg" className={BOOST_BUTTON_CLASS} disabled>
        <BoostButtonLabel
          title={TITLE}
          value={bonus}
          status={isMaxLevel ? '오늘 최대' : `${formatCooldown(remainingMs)} 뒤 가능`}
        />
      </Button>
    );
  }

  return (
    <RewardedAdButton
      ad={ad}
      label="광고 보기"
      accessibleLabel={`광고 보고 ${hammockName(status.hammockLevel + 1)}으로 넓히기 (${bonus})`}
      incompleteMessage="광고를 끝까지 보면 해먹을 넓힐 수 있어요"
      variant="secondary"
      compact
      className={BOOST_BUTTON_CLASS}
      pendingLabel="넓히는 중"
      isPending={isPending}
      renderLabel={(text, pending) => (
        <BoostButtonLabel title={TITLE} value={bonus} status={text} isPending={pending} />
      )}
      onReward={() => mutate()}
    />
  );
}
