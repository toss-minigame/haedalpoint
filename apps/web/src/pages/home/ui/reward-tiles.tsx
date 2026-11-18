import { useQuery } from '@tanstack/react-query';
import { fishingQueries } from '@/entities/fishing';
import { AdEnhanceRodButton, AdExpandHammockButton } from '@/features/fishing-ad-boosts';
import { type ContentGuides, tutorialTarget } from '@/features/welcome-tutorial';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { QuizTile, RouletteTile } from './shortcut-tiles';

type Props = {
  rewardedAd: RewardedAd;
  /** 낚싯대·양동이를 처음 누를 때 안내를 띄운다 (처음 한 번은 광고 없이 체험) */
  guides: ContentGuides;
  className?: string;
};

// 홈 위쪽 리워드 아이콘 줄: 낚싯대 강화 · 해먹 넓히기 · O/X 퀴즈 · 미끼 룰렛 (출석은 아래 출석체크 카드).
// 받을 수 있는 보상이 있으면 아이콘에 빨간 점을 붙인다.
// 낚싯대·해먹은 낚시 현황(fishingQueries.me)이 있어야 그린다 (불러오는 중·실패는 아래 해먹 카드가 알려준다).
export function RewardTiles({ rewardedAd, guides, className }: Props) {
  const { data: status, dataUpdatedAt } = useQuery(fishingQueries.me());

  return (
    <nav aria-label="오늘의 보상" className={className}>
      {/* 네 칸을 같은 너비로 나눈다 (320px 화면에서도 한 줄에 들어간다) */}
      <ul
        className="-mx-3 grid grid-cols-[repeat(4,minmax(4.25rem,1fr))]"
        {...tutorialTarget('reward-tiles')}
      >
        {status && (
          <>
            <li {...tutorialTarget('ad-rod')} {...guides.guard('rod')}>
              <AdEnhanceRodButton status={status} receivedAt={dataUpdatedAt} ad={rewardedAd} />
            </li>
            <li {...tutorialTarget('ad-hammock')} {...guides.guard('hammock')}>
              <AdExpandHammockButton status={status} receivedAt={dataUpdatedAt} ad={rewardedAd} />
            </li>
          </>
        )}
        {/* 퀴즈·룰렛은 그 화면을 처음 열 때 안내한다 */}
        <li className="col-span-2 grid grid-cols-2">
          <QuizTile />
          <RouletteTile />
        </li>
      </ul>
    </nav>
  );
}
