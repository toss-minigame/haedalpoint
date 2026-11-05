import { useQuery } from '@tanstack/react-query';
import {
  type FishingStatus,
  fishingQueries,
  HammockGauge,
  useProjectedHammock,
} from '@/entities/fishing';
import { AdEnhanceRodButton, AdExpandHammockButton } from '@/features/fishing-ad-boosts';
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

  return (
    <>
      <HammockGauge fish={fish} capacity={status.hammockCapacity} level={status.hammockLevel} />
      <StoreFishButton canStore={fish >= 1} ad={rewardedAd} />
      <WarehouseLink warehouseFish={status.warehouseFish} />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          광고로 받은 강화와 넓힌 해먹은 오늘 자정까지 유지돼요
        </p>
        <AdEnhanceRodButton status={status} receivedAt={receivedAt} ad={rewardedAd} />
        <AdExpandHammockButton status={status} receivedAt={receivedAt} ad={rewardedAd} />
      </div>
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
          <CardDescription>
            해달이 잡은 물고기는 해먹에 쌓여요. 창고에 저장해야 내 물고기가 돼요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isPending && <p className="text-muted-foreground">불러오는 중...</p>}
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
