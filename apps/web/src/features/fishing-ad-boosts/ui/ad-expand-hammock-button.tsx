import { type FishingStatus, hammockName } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { BucketIcon } from '@/shared/ui/reward-icons';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdExpandHammock } from '../api/use-fishing-ad-boosts';
import { formatCooldown } from '../lib/format-cooldown';
import { useCooldown } from '../lib/use-cooldown';
import { BOOST_BUTTON_CLASS, BoostButtonLabel } from './boost-button-label';
import { type BoostTrial, TrialBoostButton } from './trial-boost-button';

type Props = {
  status: FishingStatus;
  receivedAt: number;
  ad: RewardedAd;
  /** 튜토리얼 체험 중이면 광고 대신 이걸로 한 번 강화한다 */
  trial?: BoostTrial;
};

const TITLE = '해먹 넓히기';
const ICON = <BucketIcon />;

// 쿨타임마다 광고를 보고 해먹을 정해진 순서로 한 단계 넓히고 낚싯대도 함께 강화한다 (랜덤 없음). 오늘 자정까지 유지된다.
// 튜토리얼 체험 중(trial)에는 광고 없이 한 번 강화한다.
export function AdExpandHammockButton({ status, receivedAt, ad, trial }: Props) {
  const { mutate, isPending } = useAdExpandHammock();
  const remainingMs = useCooldown(status.adHammockExpandAvailableAt, status.serverTime, receivedAt);
  const isMaxLevel = status.hammockLevel >= status.hammockMaxLevel;
  const bonus = `+${status.adHammockBonusPercent}%`;

  if (trial) {
    return (
      <TrialBoostButton
        icon={ICON}
        title={TITLE}
        label="광고 없이"
        accessibleLabel={`광고 없이 해먹 넓히기 (용량 ${bonus})`}
        pendingLabel="넓히는 중"
        trial={trial}
      />
    );
  }

  if (isMaxLevel || remainingMs > 0) {
    return (
      <Button type="button" variant="ghost" size="lg" className={BOOST_BUTTON_CLASS} disabled>
        <BoostButtonLabel
          icon={ICON}
          title={TITLE}
          status={isMaxLevel ? '오늘 최대' : `${formatCooldown(remainingMs)} 뒤`}
        />
      </Button>
    );
  }

  return (
    <RewardedAdButton
      ad={ad}
      label={`광고 ${bonus}`}
      accessibleLabel={`광고 보고 ${hammockName(status.hammockLevel + 1)}으로 넓히기 (용량 ${bonus}, 낚시 속도 +${status.adHammockRodSpeedBonusPercent}%)`}
      incompleteMessage="광고를 끝까지 보면 해먹을 넓힐 수 있어요"
      variant="ghost"
      compact
      className={BOOST_BUTTON_CLASS}
      pendingLabel="넓히는 중"
      isPending={isPending}
      renderLabel={(text, pending) => (
        <BoostButtonLabel
          icon={ICON}
          title={TITLE}
          status={text}
          isAvailable={ad.status === 'ready'}
          isPending={pending}
        />
      )}
      onReward={() => mutate()}
    />
  );
}
