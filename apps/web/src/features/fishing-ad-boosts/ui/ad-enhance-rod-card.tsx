import type { FishingStatus } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdEnhanceRod } from '../api/use-fishing-ad-boosts';
import { formatCooldown } from '../lib/format-cooldown';
import { useCooldown } from '../lib/use-cooldown';
import { BoostCard } from './boost-card';

type Props = {
  status: FishingStatus;
  receivedAt: number;
  ad: RewardedAd;
};

const DISABLED_BUTTON_CLASS = 'h-9 w-full text-sm';

// 쿨타임마다 광고를 보고 낚싯대를 한 단계 강화한다. 강화는 오늘 자정까지 유지된다.
export function AdEnhanceRodCard({ status, receivedAt, ad }: Props) {
  const { mutate, isPending } = useAdEnhanceRod();
  const remainingMs = useCooldown(status.adRodEnhanceAvailableAt, status.serverTime, receivedAt);
  const isMaxLevel = status.rodLevel >= status.rodMaxLevel;
  const bonus = `+${status.adRodSpeedBonusPercent}%`;

  // 지금 받을 수 없는 보상이면 광고를 띄우지 않는다
  const action =
    isMaxLevel || remainingMs > 0 ? (
      <Button type="button" variant="outline" size="lg" className={DISABLED_BUTTON_CLASS} disabled>
        {isMaxLevel ? '오늘 최대' : `${formatCooldown(remainingMs)} 뒤`}
      </Button>
    ) : (
      <RewardedAdButton
        ad={ad}
        label="광고 보기"
        accessibleLabel={`광고 보고 낚싯대 강화하기 (${bonus})`}
        incompleteMessage="광고를 끝까지 보면 낚싯대를 강화할 수 있어요"
        variant="outline"
        compact
        pendingLabel="강화 중"
        isPending={isPending}
        onReward={() => mutate()}
      />
    );

  return <BoostCard title="낚싯대 강화" effect={`속도 ${bonus}`} action={action} />;
}
