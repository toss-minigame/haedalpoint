import { formatFish } from '../lib/format-fishing';

type Props = {
  fish: number;
  capacity: number;
};

// 해먹에 쌓인 물고기 / 용량
export function HammockGauge({ fish, capacity }: Props) {
  const percent = capacity > 0 ? Math.min(100, (fish / capacity) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-base font-medium">해먹</span>
        <span className="text-base tabular-nums">
          <strong className="text-lg font-bold">{formatFish(fish)}</strong>
          <span className="text-muted-foreground"> / {formatFish(capacity)}마리</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="해먹에 쌓인 물고기"
        aria-valuemin={0}
        aria-valuemax={Math.floor(capacity)}
        aria-valuenow={Math.floor(fish)}
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
