import { useState } from 'react';
import {
  type ClaimTossPointResponse,
  formatFish,
  type WarehouseTossPoint,
} from '@/entities/fishing';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PointCoinIcon } from '@/shared/ui/reward-icons';
import { useClaimTossPoint } from '../api/use-claim-toss-point';
import { TossPointClaimedDialog } from './toss-point-claimed-dialog';

type Props = {
  warehouseFish: number;
  tossPoint: WarehouseTossPoint;
};

/** 버튼을 누를 수 없을 때 버튼 대신 보여줄 문구. 누를 수 있으면 null */
function unavailableLabel(tossPoint: WarehouseTossPoint): string | null {
  if (!tossPoint.enabled) return '토스 포인트 받기를 준비하고 있어요';
  if (tossPoint.claimablePoints > 0) return null;
  if (tossPoint.todayClaimedPoints >= tossPoint.dailyLimit) {
    return `오늘은 ${tossPoint.dailyLimit}원을 모두 받았어요`;
  }
  return `물고기 ${formatFish(tossPoint.fishPerPoint)}마리부터 받을 수 있어요`;
}

// 창고 화면의 토스 포인트 받기 카드 (docs/design/warehouse-toss-point.md).
// 1원 단위로 받을 수 있는 만큼 한 번에 받는다. 받으면 결과 창이 뜬다.
// 프로모션 안내(지급 시점·조건·제한·중단 가능)는 카드 아래에 늘 보여준다
export function ClaimTossPointCard({ warehouseFish, tossPoint }: Props) {
  const [claimed, setClaimed] = useState<ClaimTossPointResponse | null>(null);
  const { mutate, isPending } = useClaimTossPoint({ onClaimed: setClaimed });
  const unavailable = unavailableLabel(tossPoint);
  const fishToNextPoint = tossPoint.fishPerPoint - (warehouseFish % tossPoint.fishPerPoint);

  return (
    <section aria-labelledby="claim-toss-point-heading">
      <Card>
        <CardHeader>
          <CardTitle id="claim-toss-point-heading" className="text-lg font-bold">
            토스 포인트로 받기
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <PointCoinIcon className="size-12 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-muted-foreground">지금 받을 수 있어요</p>
              <p className="text-2xl font-bold">{tossPoint.claimablePoints}원</p>
            </div>
          </div>
          <p className="text-[15px] break-keep text-muted-foreground">
            물고기 {formatFish(tossPoint.fishPerPoint)}마리가 토스 포인트 1원이 돼요. 다음 1원까지{' '}
            {formatFish(fishToNextPoint)}마리 남았어요.
          </p>
          {tossPoint.pendingPoints > 0 && (
            <p className="text-[15px] break-keep">
              지급하고 있는 토스 포인트가 {tossPoint.pendingPoints}원 있어요. 창고를 다시 열면
              이어서 지급해요.
            </p>
          )}
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base"
            disabled={unavailable !== null || isPending}
            onClick={() => mutate()}
          >
            {unavailable ??
              (isPending ? '받는 중' : `토스 포인트 ${tossPoint.claimablePoints}원 받기`)}
          </Button>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm break-keep text-muted-foreground">
            <li>누르면 바로 지급돼요. 늦어지면 창고를 다시 열 때 이어서 지급해요.</li>
            <li>하루 {tossPoint.dailyLimit}원까지 받을 수 있어요.</li>
            <li>부정한 방법으로 모은 물고기는 지급하지 않아요.</li>
            <li>이 프로모션은 사전 고지 없이 중단될 수 있어요.</li>
          </ul>
        </CardContent>
      </Card>
      <TossPointClaimedDialog result={claimed} onClose={() => setClaimed(null)} />
    </section>
  );
}
