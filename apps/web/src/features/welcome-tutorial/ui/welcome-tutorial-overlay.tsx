import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/shared/lib/use-reduced-motion';
import { type TargetRect, useTargetRect } from '../lib/use-target-rect';
import type { WelcomeTutorial } from '../model/use-welcome-tutorial';
import { TutorialBubble } from './tutorial-bubble';

type Props = {
  tutorial: WelcomeTutorial;
};

/** 비춘 영역 둘레 여백 (px) */
const HOLE_PADDING = 6;
/** 비춘 영역 바깥에서 누르기를 막는 조각 */
const BLOCKER_CLASS = 'pointer-events-auto fixed';
/** 말풍선과 비춘 영역 사이 (px) */
const BUBBLE_GAP = 12;

function padded(rect: TargetRect): TargetRect {
  return {
    top: rect.top - HOLE_PADDING,
    left: rect.left - HOLE_PADDING,
    width: rect.width + HOLE_PADDING * 2,
    height: rect.height + HOLE_PADDING * 2,
  };
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

// 첫 방문 튜토리얼: 홈 위에 어두운 막을 깔고 안내할 곳만 밝게 비춘다. 비춘 곳은 누를 수 있는 단계에서만 눌린다.
// 말풍선은 비춘 곳 아래에, 아래 공간이 모자라면 위에 둔다. 오른쪽 위에 건너뛰기를 늘 둔다 (마무리 단계 제외).
export function WelcomeTutorialOverlay({ tutorial }: Props) {
  const reducedMotion = useReducedMotion();
  const rect = useTargetRect(tutorial.step.target, !reducedMotion);
  const hole = rect ? padded(rect) : null;
  const showBelow = !hole || hole.top + hole.height < window.innerHeight * 0.6;
  const bubblePosition: CSSProperties = !hole
    ? { top: '50%', transform: 'translateY(-50%)' }
    : showBelow
      ? { top: hole.top + hole.height + BUBBLE_GAP }
      : { bottom: window.innerHeight - hole.top + BUBBLE_GAP };

  return createPortal(
    // 비춘 버튼을 화면 낭독기로도 누를 수 있도록 aria-modal 은 두지 않는다.
    // 바탕은 누르기를 통과시키고, 막는 조각·말풍선·건너뛰기만 누르기를 받는다 (그래야 비춘 곳이 눌린다)
    <div
      className="pointer-events-none fixed inset-0 z-50"
      role="dialog"
      aria-label="해달해달 안내"
    >
      {hole ? (
        <>
          {/* 비춘 영역 바깥을 어둡게 (그림자만, 누르기는 아래 조각들이 막는다) */}
          <div
            aria-hidden="true"
            className="fixed rounded-2xl shadow-[0_0_0_9999px_rgb(0_0_0/0.6)] transition-all duration-300 motion-reduce:transition-none"
            style={hole}
          />
          {blockerStyles(hole).map((style, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 위치가 고정된 네 조각이다
            <div key={index} aria-hidden="true" className={BLOCKER_CLASS} style={style} />
          ))}
          {!tutorial.isTargetInteractive && (
            <div aria-hidden="true" className={BLOCKER_CLASS} style={hole} />
          )}
        </>
      ) : (
        <div aria-hidden="true" className="pointer-events-auto fixed inset-0 bg-black/60" />
      )}
      {tutorial.step.action.type !== 'finish' && (
        <button
          type="button"
          onClick={tutorial.skip}
          className="pointer-events-auto fixed top-[max(0.5rem,env(safe-area-inset-top))] right-2 flex h-11 items-center rounded-full px-4 text-[15px] font-semibold text-white outline-none focus-visible:ring-3 focus-visible:ring-white/60"
        >
          건너뛰기
        </button>
      )}
      <div
        className="pointer-events-auto fixed inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-md"
        style={bubblePosition}
      >
        <TutorialBubble tutorial={tutorial} />
      </div>
    </div>,
    document.body,
  );
}
