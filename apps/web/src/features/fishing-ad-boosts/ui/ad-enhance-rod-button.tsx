import { ZapIcon } from 'lucide-react';
import type { FishingStatus } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdEnhanceRod } from '../api/use-fishing-ad-boosts';
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

const TITLE = '낚싯대 강화';
const ICON = <ZapIcon />;

// 쿨타임마다 광고를 보고 낚싯대를 한 단계 강화한다. 강화는 오늘 자정까지 유지된다.
// 튜토리얼 체험 중(trial)에는 광고 없이 한 번 강화한다.
export function AdEnhanceRodButton({ status, receivedAt, ad, trial }: Props) {
  const { mutate, isPending } = useAdEnhanceRod();
  const remainingMs = useCooldown(status.adRodEnhanceAvailableAt, status.serverTime, receivedAt);
  // 하루 최대 단계가 없으면(null) 쿨타임만 본다
  const isMaxLevel = status.rodMaxLevel !== null && status.rodLevel >= status.rodMaxLevel;
  const bonus = `+${status.adRodSpeedBonusPercent}%`;

  if (trial) {
    return (
      <TrialBoostButton
        icon={ICON}
        title={TITLE}
        label="광고 없이"
        accessibleLabel={`광고 없이 낚싯대 강화하기 (${bonus})`}
        pendingLabel="강화 중"
        trial={trial}
      />
    );
  }

  // 지금 받을 수 없는 보상이면 광고를 띄우지 않는다
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
      accessibleLabel={`광고 보고 낚싯대 강화하기 (${bonus})`}
      incompleteMessage="광고를 끝까지 보면 낚싯대를 강화할 수 있어요"
      variant="ghost"
      compact
      className={BOOST_BUTTON_CLASS}
      pendingLabel="강화 중"
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
