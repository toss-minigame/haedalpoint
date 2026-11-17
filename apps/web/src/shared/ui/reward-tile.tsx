import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Spinner } from '@/shared/ui/spinner';

/**
 * 홈 위쪽 리워드 아이콘 줄의 한 칸 모양 (흰 원 아이콘 + 두 줄 글자). Button·Link 에 className 으로 준다.
 * 누르는 영역은 가로 4.25rem · 세로 6rem 정도라 44px 를 넘는다.
 * 쿨타임처럼 누를 수 없을 때도 글자는 흐리게 하지 않고(남은 시간을 읽어야 하므로) 아이콘만 흐리게 한다.
 */
export const REWARD_TILE_CLASS =
  'h-auto w-[4.25rem] shrink-0 flex-col items-center justify-start gap-1 rounded-2xl bg-transparent px-0 py-1 text-foreground shadow-none outline-none whitespace-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-100 active:scale-95 transition-transform';

type Props = {
  icon: ReactNode;
  title: string;
  /** 아랫줄: 지금 할 수 있는 일이나 남은 시간 (예: 광고 +1%, 18분 뒤) */
  status: string;
  /** 지금 받을 수 있는 보상이 있으면 빨간 ! 를 붙인다 */
  hasBadge?: boolean;
  /** 지금 누를 수 없으면 아이콘을 흐리게 한다 */
  isDimmed?: boolean;
  isPending?: boolean;
};

// 장면(설원) 위에 바로 놓이므로 글자에 흰 빛 테두리를 둘러 어느 배경에서도 읽히게 한다
const ON_SCENE_TEXT = '[text-shadow:0_0_6px_rgb(255_255_255/0.95)]';

export function RewardTileContent({
  icon,
  title,
  status,
  hasBadge = false,
  isDimmed = false,
  isPending = false,
}: Props) {
  return (
    <>
      <span className="relative grid size-14 place-items-center rounded-full bg-card shadow-[0_2px_10px_rgb(30_70_120/0.14)]">
        <span
          aria-hidden="true"
          className={cn(
            'grid place-items-center text-primary [&_svg]:size-7!',
            isDimmed && 'opacity-40',
          )}
        >
          {icon}
        </span>
        {hasBadge && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-destructive text-[12px] leading-none font-bold text-white ring-2 ring-card"
          >
            !
          </span>
        )}
      </span>
      <span className={cn('text-[13px] leading-tight font-semibold break-keep', ON_SCENE_TEXT)}>
        {title}
      </span>
      <span
        className={cn(
          'flex items-center gap-1 text-[12px] leading-tight font-medium text-muted-foreground tabular-nums',
          ON_SCENE_TEXT,
        )}
      >
        {isPending && (
          <span className="[&_svg]:size-3">
            <Spinner />
          </span>
        )}
        {status}
      </span>
    </>
  );
}
