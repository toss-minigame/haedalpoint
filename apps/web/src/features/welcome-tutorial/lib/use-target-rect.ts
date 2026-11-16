import { useEffect, useRef, useState } from 'react';

export type TargetRect = { top: number; left: number; width: number; height: number };

/** 다음 비출 곳으로 옮겨 가는 시간 (ms) */
const MOVE_MS = 260;
/** 비출 요소가 늦게 그려지거나 위쪽 내용이 바뀌어 밀리는 경우를 잡는 주기 (ms) */
const RECHECK_MS = 300;

const sameRect = (a: TargetRect | null, b: TargetRect | null) =>
  a?.top === b?.top && a?.left === b?.left && a?.width === b?.width && a?.height === b?.height;

function toRect(box: DOMRect): TargetRect {
  return { top: box.top, left: box.left, width: box.width, height: box.height };
}

function lerp(from: TargetRect, to: TargetRect, t: number): TargetRect {
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  return {
    top: mix(from.top, to.top),
    left: mix(from.left, to.left),
    width: mix(from.width, to.width),
    height: mix(from.height, to.height),
  };
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * `[data-tutorial="target"]` 요소의 화면 위치. 단계가 바뀌면 그 요소를 화면 가운데로 스크롤하고,
 * 이전 위치에서 새 위치로 부드럽게 옮겨 간다 (animate=false 면 바로).
 * 스크롤·화면 크기·내용 크기가 바뀔 때만 다시 잰다 (매 프레임 재지 않는다). 요소가 없으면 null
 */
export function useTargetRect(target: string, animate: boolean): TargetRect | null {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const shownRef = useRef<TargetRect | null>(null);

  useEffect(() => {
    const selector = `[data-tutorial="${target}"]`;
    const from = animate ? shownRef.current : null;
    const startedAt = performance.now();
    let element: Element | null = null;
    let frame = 0;

    const show = (next: TargetRect | null) => {
      if (sameRect(shownRef.current, next)) return;
      shownRef.current = next;
      setRect(next);
    };

    const measure = () => {
      frame = 0;
      if (!element?.isConnected) {
        element = document.querySelector(selector);
        element?.scrollIntoView({ block: 'center', behavior: animate ? 'smooth' : 'auto' });
        if (element) observer.observe(element);
      }
      if (!element) {
        show(null);
        return;
      }
      const goal = toRect(element.getBoundingClientRect());
      const progress = from ? Math.min(1, (performance.now() - startedAt) / MOVE_MS) : 1;
      show(progress < 1 && from ? lerp(from, goal, easeOut(progress)) : goal);
      if (progress < 1) schedule();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    const recheck = window.setInterval(schedule, RECHECK_MS);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      window.clearInterval(recheck);
    };
  }, [target, animate]);

  return rect;
}
