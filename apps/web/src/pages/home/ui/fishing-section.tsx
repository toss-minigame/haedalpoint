import { useQuery } from '@tanstack/react-query';
import {
  type FishingStatus,
  fishingQueries,
  formatFish,
  formatRemaining,
  HammockGauge,
  useProjectedHammock,
} from '@/entities/fishing';
import { StoreFishButton } from '@/features/store-fish';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

const speedFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

function hammockMessage(isFull: boolean, msUntilFull: number): string {
  if (isFull) return '해먹이 가득 차서 해달이 쉬고 있어요';
  return `해먹이 가득 차기까지 ${formatRemaining(msUntilFull)}`;
}

function speedDetail({ rodSpeedBonusPercent, otterFriendActive }: FishingStatus): string {
  const parts = [
    rodSpeedBonusPercent > 0 && `낚싯대 +${rodSpeedBonusPercent}%`,
    otterFriendActive && '해달 친구와 함께',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '기본 속도';
}

type ContentProps = {
  status: FishingStatus;
  receivedAt: number;
};

function FishingContent({ status, receivedAt }: ContentProps) {
  const { fish, isFull, msUntilFull } = useProjectedHammock(status, receivedAt);

  return (
    <>
      <HammockGauge fish={fish} capacity={status.hammockCapacity} />
      <p className="text-base text-muted-foreground" aria-live="polite">
        {hammockMessage(isFull, msUntilFull)}
      </p>
      <dl className="grid grid-cols-2 gap-3 text-base">
        <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
          <dt className="text-muted-foreground">창고</dt>
          <dd className="font-bold tabular-nums">{formatFish(status.warehouseFish)}마리</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
          <dt className="text-muted-foreground">낚시 속도</dt>
          <dd className="font-bold tabular-nums">
            시간당 {speedFormatter.format(status.fishPerHour)}마리
          </dd>
          <dd className="text-sm text-muted-foreground">{speedDetail(status)}</dd>
        </div>
      </dl>
      <StoreFishButton canStore={fish >= 1} />
    </>
  );
}

export function FishingSection() {
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
          {isError && <p className="text-destructive">{error.message}</p>}
          {status && <FishingContent status={status} receivedAt={dataUpdatedAt} />}
        </CardContent>
      </Card>
    </section>
  );
}
