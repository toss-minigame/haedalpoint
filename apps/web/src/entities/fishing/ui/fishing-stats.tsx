import { formatFullAt, formatRemaining } from '../lib/format-hammock-full';
import type { FishingStatus } from '../model/types';

type Props = {
  status: FishingStatus;
  /** status 를 받은 시각 (Date.now()). 남은 시간을 서버 시각 기준으로 줄여 나간다 */
  receivedAt: number;
};

// 해먹 게이지 아래 현황: 오늘 낚싯대 강화(%)와 해먹이 가득 차는 시각.
// 부모(FishingContent)가 1초마다 다시 그리므로 남은 시간도 1초마다 줄어든다.
export function FishingStats({ status, receivedAt }: Props) {
  const elapsedMs = Date.now() - receivedAt;
  const now = new Date(Date.parse(status.serverTime) + elapsedMs);
  const fullAt = status.hammockFullAt ? new Date(status.hammockFullAt) : null;
  const remainingMs = fullAt ? fullAt.getTime() - now.getTime() : 0;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="text-muted-foreground">낚싯대 강화</dt>
      <dd className="tabular-nums">
        +{status.rodSpeedBonusPercent}% ({status.rodLevel}/{status.rodMaxLevel}단계)
      </dd>
      <dt className="text-muted-foreground">해먹 가득</dt>
      <dd className="tabular-nums">
        {fullAt && remainingMs > 0
          ? `${formatFullAt(fullAt, now)} (${formatRemaining(remainingMs)} 남음)`
          : '가득 찼어요'}
      </dd>
    </dl>
  );
}
