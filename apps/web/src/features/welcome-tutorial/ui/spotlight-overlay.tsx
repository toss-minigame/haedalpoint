import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/shared/lib/use-reduced-motion';
import { type TargetRect, useTargetRect } from '../lib/use-target-rect';
import type { BubblePlacement } from '../model/steps';

type Props = {
  /** 비출 요소의 data-tutorial 값 */
  target: string;
  /** 비춘 곳을 누를 수 있는지 (직접 해 보는 단계) */
  isTargetInteractive: boolean;
  /** 말풍선이 바뀔 때마다 새로 나타나게 하는 값 (단계 id 등) */
  bubbleKey: string;
  bubblePlacement?: BubblePlacement;
  /** 주면 말풍선 위나 아래에 건너뛰기를 둔다 */
  onSkip?: () => void;
  /** 건너뛰기 버튼 글자 (기본 건너뛰기) */
  skipLabel?: string;
  label: string;
  children: ReactNode;
};

/** 비춘 영역 둘레 여백 (px) */
const HOLE_PADDING = 12;
const HOLE_RADIUS = 16;
/** 말풍선과 비춘 영역 사이 (px) */
const BUBBLE_GAP = 12;
/** 말풍선(건너뛰기 포함)을 비춘 곳 위·아래에 두려면 필요한 높이 (px). 둘 다 모자라면 화면 아래에 겹쳐 둔다 */
const BUBBLE_SPACE = 230;
/** 비춘 영역 바깥에서 누르기를 막는 조각 */
const BLOCKER_CLASS = 'pointer-events-auto fixed';
/** 화면보다 넉넉히 큰 바깥 사각형 (어둡게 칠할 영역) */
const OUTER_PATH = 'M-100 -100H10000V10000H-100Z';

/** 비춘 영역이 화면 끝에 닿지 않게 두는 최소 여백 (px). 화면 모서리에 붙은 요소도 둥근 모서리가 잘리지 않는다 */
const VIEWPORT_MARGIN = 4;

/** 둘레 여백을 더하되, 화면 밖으로 나가는 쪽은 화면 안쪽(VIEWPORT_MARGIN)에서 자른다 */
function padded(rect: TargetRect): TargetRect {
  const left = Math.max(VIEWPORT_MARGIN, rect.left - HOLE_PADDING);
  const top = Math.max(VIEWPORT_MARGIN, rect.top - HOLE_PADDING);
  const right = Math.min(
    window.innerWidth - VIEWPORT_MARGIN,
    rect.left + rect.width + HOLE_PADDING,
  );
  const bottom = Math.min(
    window.innerHeight - VIEWPORT_MARGIN,
    rect.top + rect.height + HOLE_PADDING,
  );
  return { top, left, width: right - left, height: bottom - top };
}

/** 모서리가 둥근 구멍. 바깥 사각형과 함께 evenodd 로 칠하면 이 부분만 뚫린다 */
function holePath({ top: y, left: x, width: w, height: h }: TargetRect): string {
  const r = Math.min(HOLE_RADIUS, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** 비춘 영역 바깥 네 조각. 눌러도 아래 화면에 닿지 않게 막는다 */
function blockerStyles(hole: TargetRect): CSSProperties[] {
  const right = hole.left + hole.width;
  const bottom = hole.top + hole.height;
  return [
    { top: 0, left: 0, right: 0, height: Math.max(0, hole.top) },
    { top: bottom, left: 0, right: 0, bottom: 0 },
    { top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height },
    { top: hole.top, left: right, right: 0, height: hole.height },
  ];
}

/**
 * 말풍선 자리와, 비춘 곳 위(above)에 놓였는지.
 * 위에 놓이면 건너뛰기를 말풍선 위에, 아니면 말풍선 아래에 둬서 비춘 곳과 겹치지 않게 한다
 */
function bubbleLayout(
  hole: TargetRect | null,
  placement: BubblePlacement,
): { style: CSSProperties; isAbove: boolean } {
  if (!hole) return { style: { top: '50%', transform: 'translateY(-50%)' }, isAbove: false };
  const above = { style: { bottom: window.innerHeight - hole.top + BUBBLE_GAP }, isAbove: true };
  if (placement === 'above' && hole.top >= BUBBLE_SPACE) return above;
  const bottom = hole.top + hole.height;
  if (window.innerHeight - bottom >= BUBBLE_SPACE) {
    return { style: { top: bottom + BUBBLE_GAP }, isAbove: false };
  }
  if (hole.top >= BUBBLE_SPACE) return above;
  return { style: { bottom: 'max(1rem, env(safe-area-inset-bottom))' }, isAbove: false };
}

/** 말풍선 오른쪽 위나 오른쪽 아래에 두는 건너뛰기 (어두운 막 위라 흰 글자) */
function SkipButton({ onSkip, label }: { onSkip: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className="flex h-11 items-center self-end rounded-full px-4 text-[15px] font-semibold text-white/90 outline-none focus-visible:ring-3 focus-visible:ring-white/60"
    >
      {label}
    </button>
  );
}

// 화면 위에 어두운 막을 깔고 안내할 곳만 밝게 비춘다. 비춘 곳은 누를 수 있는 단계에서만 눌린다.
// 막은 SVG 하나로 칠해(큰 그림자보다 가볍다) 비출 곳이 바뀌면 구멍이 부드럽게 옮겨 간다.
// 말풍선은 비춘 곳 아래에, 아래 공간이 모자라면 위에 둔다 (bubblePlacement='above' 면 위가 먼저).
// 건너뛰기는 말풍선에 붙여 비춘 곳 반대쪽(말풍선 위 또는 아래)에 둔다.
export function SpotlightOverlay({
  target,
  isTargetInteractive,
  bubbleKey,
  bubblePlacement = 'auto',
  onSkip,
  skipLabel = '건너뛰기',
  label,
  children,
}: Props) {
  const reducedMotion = useReducedMotion();
  const rect = useTargetRect(target, !reducedMotion);
  const hole = rect ? padded(rect) : null;
  const bubble = bubbleLayout(hole, bubblePlacement);

  return createPortal(
    // 비춘 버튼을 화면 낭독기로도 누를 수 있도록 aria-modal 은 두지 않는다.
    // 바탕은 누르기를 통과시키고, 막는 조각·말풍선·건너뛰기만 누르기를 받는다 (그래야 비춘 곳이 눌린다)
    <div className="pointer-events-none fixed inset-0 z-50" role="dialog" aria-label={label}>
      <svg aria-hidden="true" className="fixed inset-0 size-full">
        <path
          fillRule="evenodd"
          fill="rgb(0 0 0 / 0.75)"
          d={hole ? `${OUTER_PATH}${holePath(hole)}` : OUTER_PATH}
        />
      </svg>
      {hole ? (
        <>
          {blockerStyles(hole).map((style, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 위치가 고정된 네 조각이다
            <div key={index} aria-hidden="true" className={BLOCKER_CLASS} style={style} />
          ))}
          {!isTargetInteractive && (
            <div aria-hidden="true" className={BLOCKER_CLASS} style={hole} />
          )}
        </>
      ) : (
        <div aria-hidden="true" className="pointer-events-auto fixed inset-0" />
      )}
      <div
        className="pointer-events-auto fixed inset-x-0 mx-auto flex w-fit max-w-[min(28rem,calc(100%-2rem))] flex-col gap-1"
        style={bubble.style}
      >
        {onSkip && bubble.isAbove && <SkipButton onSkip={onSkip} label={skipLabel} />}
        {/* 말풍선이 바뀔 때 살짝 떠오르며 나타난다 (동작 줄이기면 바로) */}
        <div
          key={bubbleKey}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
        >
          {children}
        </div>
        {onSkip && !bubble.isAbove && <SkipButton onSkip={onSkip} label={skipLabel} />}
      </div>
    </div>,
    document.body,
  );
}
