import { useQuery } from '@tanstack/react-query';
import { fishingQueries } from '@/entities/fishing';
import { CheckInTile } from '@/features/check-in';
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

// 홈 위쪽 리워드 아이콘 줄: 출석 · 낚싯대 강화 · 해먹 넓히기 · O/X 퀴즈 · 미끼 룰렛.
// 받을 수 있는 보상이 있으면 아이콘에 빨간 ! 를 붙인다. 좁은 화면에서는 옆으로 밀어 본다.
// 낚싯대·해먹은 낚시 현황(fishingQueries.me)이 있어야 그린다 (불러오는 중·실패는 아래 해먹 카드가 알려준다).
export function RewardTiles({ rewardedAd, rodTrial, hammockTrial, className }: Props) {
  const { data: status, dataUpdatedAt } = useQuery(fishingQueries.me());

  return (
    <nav aria-label="오늘의 보상" className={className}>
      {/* 다섯 칸을 같은 너비로 나눈다. 좁은 화면에서도 들어가게 양옆 여백을 조금 넘어 쓰고, 그래도 좁으면 옆으로 밀어 본다 */}
      <ul className="-mx-3 grid grid-cols-[repeat(5,minmax(4.25rem,1fr))] justify-items-center overflow-x-auto [scrollbar-width:none]">
        <li {...tutorialTarget('check-in')}>
          <CheckInTile ad={rewardedAd} />
        </li>
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
