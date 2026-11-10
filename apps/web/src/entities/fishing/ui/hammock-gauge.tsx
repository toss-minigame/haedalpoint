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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* 장식용: 바로 옆 이름이 같은 내용을 읽어 준다 */}
        <img
          src={hammockImage(level)}
          alt=""
          className="size-14 shrink-0 rounded-2xl bg-secondary p-1"
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] text-muted-foreground">{hammockName(level)}</span>
          {/* 좁은 화면에서는 용량이 통째로 다음 줄로 내려간다 ('/' 만 떨어지지 않게) */}
          <span className="flex flex-wrap items-baseline gap-x-1 tabular-nums">
            <strong className="text-[28px] leading-tight font-bold">{formatFish(fish)}</strong>
            <span className="text-[15px] whitespace-nowrap text-muted-foreground">
              / {formatFish(capacity)}마리
            </span>
          </span>
        </div>
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
