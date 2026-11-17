import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  type FishingStatus,
  fishingQueries,
  HammockGauge,
  useProjectedHammock,
} from '@/entities/fishing';
import { CatchBackDialog } from '@/features/catch-back-fish';
import { StoreFishButton } from '@/features/store-fish';
import { tutorialTarget } from '@/features/welcome-tutorial';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';

/** 화면에 1마리 이상 보일 때부터 저장할 수 있다 (화면은 정수로 내림해 보여준다) */
const MIN_STORE_FISH = 1;

type ContentProps = {
  status: FishingStatus;
  receivedAt: number;
  rewardedAd: RewardedAd;
  onTutorialStored?: (storedFish: number) => void;
};

function HammockContent({ status, receivedAt, rewardedAd, onTutorialStored }: ContentProps) {
  const fish = useProjectedHammock(status, receivedAt);
  // 다시 잡아오기 창에 함께 보여줄, 방금 저장한 양. null 이면 창이 닫혀 있다
  const [catchBackStoredFish, setCatchBackStoredFish] = useState<number | null>(null);
  // 다시 잡아오기는 광고를 봐야만 받을 수 있어, 광고를 쓸 수 없는 환경에서는 권하지 않는다
  const openCatchBack = (storedFish: number) => {
    if (rewardedAd.status === 'unsupported') return false;
    setCatchBackStoredFish(storedFish);
    return true;
  };

  return (
    <>
      <div {...tutorialTarget('hammock')}>
        <HammockGauge fish={fish} status={status} receivedAt={receivedAt} />
      </div>
      <div {...tutorialTarget('store')}>
        <StoreFishButton
          canStore={fish >= MIN_STORE_FISH}
          ad={rewardedAd}
          onCatchBackAvailable={openCatchBack}
          onStored={onTutorialStored}
        />
      </div>
      <CatchBackDialog
        storedFish={catchBackStoredFish}
        onClose={() => setCatchBackStoredFish(null)}
        ad={rewardedAd}
      />
    </>
  );
}

type Props = {
  rewardedAd: RewardedAd;
  /** 튜토리얼 마지막 저장 단계에서만 준다 */
  onTutorialStored?: (storedFish: number) => void;
  className?: string;
};

// 홈 맨 아래 카드: 해먹 진행 막대와 가득 차기까지 남은 시간, 창고 저장 버튼만 둔다
export function HammockPanel({ rewardedAd, onTutorialStored, className }: Props) {
  const { data: status, dataUpdatedAt, isPending, isError, error } = useQuery(fishingQueries.me());

  return (
    <section aria-labelledby="hammock-heading" className={className}>
      <h2 id="hammock-heading" className="sr-only">
        해먹
      </h2>
      <div className="flex flex-col gap-4">
        {isPending && <p className="text-[15px] text-muted-foreground">해먹을 불러오고 있어요</p>}
        {/* 주기적 재조회가 실패해도 이전 값이 있으면 그대로 보여준다 */}
        {isError && !status && <p className="text-[15px] text-destructive">{error.message}</p>}
        {status && (
          <HammockContent
            status={status}
            receivedAt={dataUpdatedAt}
            rewardedAd={rewardedAd}
            onTutorialStored={onTutorialStored}
          />
        )}
      </div>
    </section>
  );
}
