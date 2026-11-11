import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  FishingStats,
  type FishingStatus,
  fishingQueries,
  HammockGauge,
  useProjectedHammock,
} from '@/entities/fishing';
import { CatchBackDialog } from '@/features/catch-back-fish';
import { StoreFishButton } from '@/features/store-fish';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { WarehouseLink } from './warehouse-link';

type ContentProps = {
  status: FishingStatus;
  receivedAt: number;
  rewardedAd: RewardedAd;
};

function FishingContent({ status, receivedAt, rewardedAd }: ContentProps) {
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
      <HammockGauge fish={fish} capacity={status.hammockCapacity} level={status.hammockLevel} />
      <FishingStats status={status} receivedAt={receivedAt} />
      <StoreFishButton canStore={fish > 0} ad={rewardedAd} onCatchBackAvailable={openCatchBack} />
      <WarehouseLink warehouseFish={status.warehouseFish} />
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
};

export function FishingSection({ rewardedAd }: Props) {
  const { data: status, dataUpdatedAt, isPending, isError, error } = useQuery(fishingQueries.me());

  return (
    <section aria-labelledby="fishing-heading">
      <Card>
        <CardHeader>
          <CardTitle id="fishing-heading" className="text-lg font-bold">
            해달 낚시
          </CardTitle>
          <CardDescription className="text-[15px] break-keep">
            해달이 잡은 물고기는 해먹에 쌓여요. 창고에 저장해야 내 물고기가 돼요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isPending && <p className="text-muted-foreground">낚시 현황을 불러오고 있어요</p>}
          {/* 주기적 재조회가 실패해도 이전 값이 있으면 그대로 보여준다 */}
          {isError && !status && <p className="text-destructive">{error.message}</p>}
          {status && (
            <FishingContent status={status} receivedAt={dataUpdatedAt} rewardedAd={rewardedAd} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
