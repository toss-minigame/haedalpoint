import { formatFullAt, formatRemaining } from '../lib/format-hammock-full';
import type { FishingStatus } from '../model/types';

type Props = {
  status: FishingStatus;
  /** status 를 받은 시각 (Date.now()). 남은 시간을 서버 시각 기준으로 줄여 나간다 */
  receivedAt: number;
};

// 해먹 게이지 아래 현황: 해먹이 가득 차는 시각. (오늘의 강화는 해달 장면 위 '오늘의 강화'에서 보여준다)
// 부모(FishingContent)가 1초마다 다시 그리므로 남은 시간도 1초마다 줄어든다.
export function FishingStats({ status, receivedAt }: Props) {
  const elapsedMs = Date.now() - receivedAt;
  const now = new Date(Date.parse(status.serverTime) + elapsedMs);
  const fullAt = status.hammockFullAt ? new Date(status.hammockFullAt) : null;
  const remainingMs = fullAt ? fullAt.getTime() - now.getTime() : 0;

  return (
    <dl className="flex flex-wrap gap-2 text-[15px]">
      <div className="flex gap-1.5 rounded-full bg-secondary px-3 py-1.5">
        {/* 칩 문장이 그대로 읽히도록 항목 이름은 낭독기에만 준다 */}
        <dt className="sr-only">해먹이 가득 차는 시각</dt>
        <dd className="font-semibold text-secondary-foreground tabular-nums">
          {fullAt && remainingMs > 0
            ? `${formatFullAt(fullAt, now)}에 가득 차요 (${formatRemaining(remainingMs)} 뒤)`
            : '가득 찼어요 · 창고에 저장하세요'}
        </dd>
      </div>
    </dl>
  );
}
