import { useQuery } from '@tanstack/react-query';
import { fishingQueries } from '@/entities/fishing';
import {
  AdEnhanceRodButton,
  AdExpandHammockButton,
  type BoostTrial,
} from '@/features/fishing-ad-boosts';
import { tutorialTarget } from '@/features/welcome-tutorial';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';

type Props = {
  rewardedAd: RewardedAd;
  /** 튜토리얼 체험 중인 버튼만 광고 없이 강화한다 */
  rodTrial?: BoostTrial;
  hammockTrial?: BoostTrial;
};

const BUTTON_SLOT_CLASS = 'flex min-w-0 flex-1';

// 해달 장면 위: 광고 보고 낚싯대 강화 · 해먹 넓히기 버튼을 나란히 둔다.
// 해달 낚시 카드와 같은 현황(fishingQueries.me)을 함께 쓴다. 불러오는 중·실패 표시는 해달 낚시 카드가 하므로,
// 현황이 없으면 그리지 않는다.
export function FishingBoostSection({ rewardedAd, rodTrial, hammockTrial }: Props) {
  const { data: status, dataUpdatedAt } = useQuery(fishingQueries.me());
  if (!status) return null;

  return (
    <section aria-labelledby="fishing-boost-heading">
      <h2 id="fishing-boost-heading" className="sr-only">
        낚시 강화
      </h2>
      <div className="flex gap-3">
        <div className={BUTTON_SLOT_CLASS} {...tutorialTarget('ad-rod')}>
          <AdEnhanceRodButton
            status={status}
            receivedAt={dataUpdatedAt}
            ad={rewardedAd}
            trial={rodTrial}
          />
        </div>
        <div className={BUTTON_SLOT_CLASS} {...tutorialTarget('ad-hammock')}>
          <AdExpandHammockButton
            status={status}
            receivedAt={dataUpdatedAt}
            ad={rewardedAd}
            trial={hammockTrial}
          />
        </div>
      </div>
    </section>
  );
}
