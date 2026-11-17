import { PailIcon } from '@/shared/ui/reward-icons';
import { formatFish } from '../lib/format-fishing';
import { formatRemaining } from '../lib/format-hammock-full';
import { hammockName } from '../lib/hammock-name';
import type { FishingStatus } from '../model/types';

type Props = {
  /** 지금 해먹에 쌓인 물고기 (화면에서 1초마다 늘려 그리는 값) */
  fish: number;
  status: FishingStatus;
  /** status 를 받은 시각 (Date.now()). 남은 시간을 서버 시각 기준으로 줄여 나간다 */
  receivedAt: number;
};

/** 양동이가 가득 차기까지 남은 시간 문장 (서버 시각 기준) */
function fullAtSentence(status: FishingStatus, receivedAt: number): string {
  const now = new Date(Date.parse(status.serverTime) + Date.now() - receivedAt);
  const fullAt = status.hammockFullAt ? new Date(status.hammockFullAt) : null;
  const remainingMs = fullAt ? fullAt.getTime() - now.getTime() : 0;
  if (!fullAt || remainingMs <= 0) return '가득 찼어요 · 창고에 저장하세요';
  return `${formatRemaining(remainingMs)} 뒤 가득 차요`;
}

// 홈 아래 카드: 양동이 그림 · 이름 옆에 가득 차기까지 남은 시간 · 진행 막대 · 쌓인 물고기 / 용량.
// 부모가 1초마다 다시 그리므로 남은 시간도 1초마다 줄어든다.
export function HammockGauge({ fish, status, receivedAt }: Props) {
  const capacity = status.hammockCapacity;
  const percent = capacity > 0 ? Math.min(100, (fish / capacity) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary"
      >
        <PailIcon className="size-8" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* 이름 바로 옆에 가득 차기까지 남은 시간 (길면 자연스럽게 다음 줄로) */}
        <p className="text-[13px] leading-snug break-keep text-muted-foreground tabular-nums">
          <span className="mr-2 text-base font-semibold whitespace-nowrap text-foreground">
            {hammockName(status.hammockLevel)}
          </span>
          {fullAtSentence(status, receivedAt)}
        </p>
        <div
          role="progressbar"
          aria-label="양동이에 쌓인 물고기"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.floor(percent)}
          aria-valuetext={`${formatFish(fish)} / ${formatFish(capacity)}마리`}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-right text-[15px] whitespace-nowrap tabular-nums">
          <strong className="font-bold">{formatFish(fish)}</strong>
          <span className="text-muted-foreground"> / {formatFish(capacity)}마리</span>
        </p>
      </div>
    </div>
  );
}
