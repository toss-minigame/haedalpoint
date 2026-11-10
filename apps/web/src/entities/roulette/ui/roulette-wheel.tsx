import type { BaitRouletteFish } from '../model/types';

type Props = {
  fishes: BaitRouletteFish[];
  /** 누적 회전 각도 (deg, 시계 방향). 바뀌면 그 각도까지 감속하며 돈다 */
  rotation: number;
  /** 회전 애니메이션을 끄고 바로 멈춘다 (동작 줄이기 설정) */
  instant: boolean;
  onSpinEnd?: () => void;
};

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = CENTER - 4;
const LABEL_RADIUS = RADIUS * 0.62;
const HUB_RADIUS = 22;
// 바다·모래·해초·햇빛 톤. 칸끼리 구분만 되게 채도를 낮춘다
const SLICE_COLORS = ['#d9ebf3', '#f3e4d0', '#dcebdc', '#efe5bf'];
const SPIN_DURATION_MS = 3600;

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER + radius * Math.sin(rad), CENTER - radius * Math.cos(rad)];
}

function slicePath(index: number, count: number): string {
  const step = 360 / count;
  const [x0, y0] = polar(index * step - step / 2, RADIUS);
  const [x1, y1] = polar(index * step + step / 2, RADIUS);
  const largeArc = step > 180 ? 1 : 0;
  return `M${CENTER},${CENTER} L${x0},${y0} A${RADIUS},${RADIUS} 0 ${largeArc} 1 ${x1},${y1} Z`;
}

// 이달의 제철 생선 칸이 그려진 원판과 위쪽 바늘.
// 칸 i 의 가운데가 위쪽(0deg)에서 시계 방향으로 i * (360 / 칸 수) 만큼 떨어져 있다.
export function RouletteWheel({ fishes, rotation, instant, onSpinEnd }: Props) {
  const step = 360 / fishes.length;
  const names = fishes.map((fish) => fish.name).join(', ');

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg
        viewBox="0 0 24 20"
        aria-hidden="true"
        className="absolute top-0 left-1/2 z-10 w-6 -translate-x-1/2 -translate-y-1 text-foreground"
      >
        <path d="M12 19 2 3.5Q12-1 22 3.5Z" fill="currentColor" />
      </svg>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`룰렛 칸: ${names}`}
        className="block w-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: instant
            ? 'none'
            : `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.6, 0.15, 1)`,
        }}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'transform') onSpinEnd?.();
        }}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 2} fill="var(--foreground)" opacity={0.08} />
        {fishes.map((fish, index) => {
          const [labelX, labelY] = polar(index * step, LABEL_RADIUS);
          return (
            <g key={fish.code}>
              <path
                d={slicePath(index, fishes.length)}
                fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                stroke="var(--background)"
                strokeWidth={3}
              />
              <text
                x={labelX}
                y={labelY}
                transform={`rotate(${index * step} ${labelX} ${labelY})`}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-[18px] font-bold"
              >
                {fish.name}
              </text>
            </g>
          );
        })}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_RADIUS}
          fill="var(--background)"
          stroke="var(--border)"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}
