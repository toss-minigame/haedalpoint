import { formatFish } from '../lib/format-fishing';
import { hammockImage } from '../lib/hammock-image';
import { hammockName } from '../lib/hammock-name';

type Props = {
  fish: number;
  capacity: number;
  /** 오늘 광고로 넓힌 해먹 단계 */
  level: number;
};

// 해먹에 쌓인 물고기 / 용량
export function HammockGauge({ fish, capacity, level }: Props) {
  const percent = capacity > 0 ? Math.min(100, (fish / capacity) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-base font-medium">
          {/* 장식용: 바로 옆 이름이 같은 내용을 읽어 준다 */}
          <img src={hammockImage(level)} alt="" className="size-12 shrink-0" />
          {hammockName(level)}
        </span>
        <span className="text-base tabular-nums">
          <strong className="text-lg font-bold">{formatFish(fish)}</strong>
          <span className="text-muted-foreground"> / {formatFish(capacity)}마리</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="해먹에 쌓인 물고기"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(percent)}
        aria-valuetext={`${formatFish(fish)} / ${formatFish(capacity)}마리`}
        className="h-3 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
