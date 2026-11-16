import { useEffect, useState } from 'react';

export type TargetRect = { top: number; left: number; width: number; height: number };

const sameRect = (a: TargetRect | null, b: TargetRect | null) =>
  a?.top === b?.top && a?.left === b?.left && a?.width === b?.width && a?.height === b?.height;

/**
 * `[data-tutorial="target"]` 요소의 화면 위치. 단계가 바뀌면 그 요소를 화면 가운데로 스크롤하고,
 * 스크롤·화면 크기·내용(현황을 다시 받아 높이가 바뀜) 변화를 따라가도록 매 프레임 잰다 (튜토리얼 동안만).
 * 요소가 없으면 null
 */
export function useTargetRect(target: string, smoothScroll: boolean): TargetRect | null {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    const selector = `[data-tutorial="${target}"]`;
    document.querySelector(selector)?.scrollIntoView({
      block: 'center',
      behavior: smoothScroll ? 'smooth' : 'auto',
    });

    let frame = 0;
    let last: TargetRect | null = null;
    const measure = () => {
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      const nextRect = box
        ? { top: box.top, left: box.left, width: box.width, height: box.height }
        : null;
      if (!sameRect(last, nextRect)) {
        last = nextRect;
        setRect(nextRect);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [target, smoothScroll]);

  return rect;
}
