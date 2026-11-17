import { useQuery } from '@tanstack/react-query';
import { fishingQueries } from '@/entities/fishing';
import {
  AdEnhanceRodButton,
  AdExpandHammockButton,
  type BoostTrial,
} from '@/features/fishing-ad-boosts';
import { tutorialTarget } from '@/features/welcome-tutorial';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { QuizTile, RouletteTile } from './shortcut-tiles';

type Props = {
  rewardedAd: RewardedAd;
  /** 튜토리얼 체험 중인 버튼만 광고 없이 강화한다 */
  rodTrial?: BoostTrial;
  hammockTrial?: BoostTrial;
  className?: string;
};

// 홈 위쪽 리워드 아이콘 줄: 낚싯대 강화 · 해먹 넓히기 · O/X 퀴즈 · 미끼 룰렛 (출석은 아래 출석체크 카드).
// 받을 수 있는 보상이 있으면 아이콘에 빨간 점을 붙인다.
// 낚싯대·해먹은 낚시 현황(fishingQueries.me)이 있어야 그린다 (불러오는 중·실패는 아래 해먹 카드가 알려준다).
export function RewardTiles({ rewardedAd, rodTrial, hammockTrial, className }: Props) {
  const { data: status, dataUpdatedAt } = useQuery(fishingQueries.me());

  return (
    <nav aria-label="오늘의 보상" className={className}>
      {/* 네 칸을 같은 너비로 나눈다 (320px 화면에서도 한 줄에 들어간다) */}
      <ul className="-mx-3 grid grid-cols-[repeat(4,minmax(4.25rem,1fr))] justify-items-center">
        {status && (
          <>
            <li {...tutorialTarget('ad-rod')}>
              <AdEnhanceRodButton
                status={status}
                receivedAt={dataUpdatedAt}
                ad={rewardedAd}
                trial={rodTrial}
              />
            </li>
            <li {...tutorialTarget('ad-hammock')}>
              <AdExpandHammockButton
                status={status}
                receivedAt={dataUpdatedAt}
                ad={rewardedAd}
                trial={hammockTrial}
              />
            </li>
          </>
        )}
        {/* 튜토리얼이 퀴즈·룰렛을 함께 비춘다 */}
        <li
          className="col-span-2 grid w-full grid-cols-2 justify-items-center"
          {...tutorialTarget('shortcuts')}
        >
          <QuizTile />
          <RouletteTile />
        </li>
      </ul>
    </nav>
  );
}
